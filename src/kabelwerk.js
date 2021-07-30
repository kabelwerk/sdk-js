import { Socket } from 'phoenix';

import { initDispatcher } from './dispatcher.js';
import {
    CONNECTION_ERROR,
    PUSH_REJECTED,
    TIMEOUT,
    USAGE_ERROR,
    initError
} from './errors.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { parseOwnHub, parseOwnUser } from './payloads.js';
import { initRoom } from './room.js';


// Init a Kabelwerk object.
//
const initKabelwerk = function() {
    let config = {
        url: 'wss://hub.kabelwerk.io/socket/user',
        token: '',
        refreshToken: null,
        logging: 'silent',
    };

    let dispatcher = initDispatcher([
        'connected',
        'disconnected',
        'error',
        'ready',
        'user_updated',
    ]);

    // internal state
    let ready = false;
    let user = null;
    let tokenIsRefreshing = false;

    // the phoenix socket
    let socket = null;

    const setupSocket = function () {
        socket = new Socket(config.url, {
            params: function () {
                return { token: config.token };
            },
            logger: function (kind, msg, data) {
                logger.debug(`${kind}: ${msg}`, data);
            },
        });

        socket.onOpen(function () {
            logger.info('Websocket connected.');
            dispatcher.send('connected', {});
        });

        socket.onClose(function (event) {
            logger.info('Websocket disconnected.');
            dispatcher.send('disconnected', {});
        });

        socket.onError(function (error) {
            if (config.refreshToken && !tokenIsRefreshing) {
                tokenIsRefreshing = true;

                config.refreshToken(config.token).then(function(newToken) {
                    config.token = newToken;
                    tokenIsRefreshing = false;
                }).catch(function (error) {
                    tokenIsRefreshing = false;
                });
            }

            logger.error('Websocket error.', error);
            dispatcher.send('error', initError(CONNECTION_ERROR, error));
        });
    };

    // the private channel
    let privateChannel = null;

    const setupPrivateChannel = function () {
        privateChannel = socket.channel('private');

        privateChannel.on('user_updated', function (payload) {
            user = parseOwnUser(payload);
            dispatcher.send('user_updated', user);
        });

        dispatcher.once('connected', function () {
            privateChannel.join()
                .receive('ok', function (payload) {
                    logger.info("Joined the user's private channel.");

                    if (user) {
                        user = parseOwnUser(payload);
                    } else {
                        user = parseOwnUser(payload);
                        dispatcher.send('user_updated', user);
                    }

                    if (!ready) {
                        ready = true;
                        dispatcher.send('ready', {});
                    }
                })
                .receive('error', function (error) {
                    logger.error("Failed to join the user's private channel.", error);
                    dispatcher.send('error', initError(PUSH_REJECTED));
                })
                .receive('timeout', function () {
                    dispatcher.send('error', initError(TIMEOUT));
                });
        });
    };

    const ensureReady = function() {
        if (!ready) {
            throw initError(USAGE_ERROR, 'The Kabelwerk object is not ready yet.');
        }
    };

    return {

        // Update the config.
        //
        config: function (newConfig) {
            for (let key of Object.keys(newConfig)) {
                if (config.hasOwnProperty(key)) {
                    config[key] = newConfig[key];
                }
            }

            logger.setLevel(config.logging);
        },

        // Connect to the Kabelwerk backend.
        //
        connect: function () {
            if (socket) {
                throw initError(USAGE_ERROR, 'Kabewerk.connect was already called once.');
            }

            setupSocket();
            setupPrivateChannel();

            socket.connect();
        },

        // Disconnect the websocket.
        //
        disconnect: function () {
            if (socket) {
                socket.disconnect();
            }

            privateChannel = null;
            socket = null;

            user = null;
            ready = false;
        },

        // Returns the connected user's info.
        //
        getUser: function () {
            ensureReady();
            return user;
        },

        // Update the connected user's info. Return a promise resolving into
        // the (updated) user info.
        //
        updateUser: function (params) {
            ensureReady();

            return new Promise(function (resolve, reject) {
                let push = privateChannel.push('update_user', params);

                push.receive('ok', function (payload) {
                    user = parseOwnUser(payload);
                    resolve(user);
                });

                push.receive('error', function (error) {
                    logger.error("Failed to update the user's info.", error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Init and return an inbox object.
        //
        openInbox: function (params) {
            ensureReady();

            let topic = user.hubId ? `hub_inbox:${user.hubId}` : `user_inbox:${user.id}`;

            return initInbox(socket, topic, params);
        },

        // Create a room for the connected user. Return a promise resolving
        // into an object with the newly created room's ID.
        //
        createRoom: function (hubId) {
            ensureReady();

            return new Promise(function (resolve, reject) {
                let push = privateChannel.push('create_room', { hub: hubId });

                push.receive('ok', function (payload) {
                    resolve({ id: payload.id });
                });

                push.receive('error', function (error) {
                    logger.error('Failed to create a new room.', error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Init and return a room object.
        //
        openRoom: function (roomId) {
            ensureReady();
            return initRoom(socket, roomId);
        },

        // Retrieve info about the user's hub (name, list of fellow hub users).
        // Return a promise resolving into that info.
        //
        // This method only works for hub users.
        //
        loadHubInfo: function () {
            ensureReady();

            return new Promise(function (resolve, reject) {
                let push = privateChannel.push('get_hub', {});

                push.receive('ok', function (payload) {
                    resolve(parseOwnHub(payload));
                });

                push.receive('error', function (error) {
                    logger.error("Failed to load the user hub's info.", error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};


export { initKabelwerk };
