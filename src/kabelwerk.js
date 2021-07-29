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

    const setupSocket = () => {
        socket = new Socket(config.url, {
            params: () => {
                return { token: config.token };
            },
        });

        socket.onOpen(() => {
            logger.info('Websocket connected.');
            dispatcher.send('connected', {});
        });

        socket.onClose((e) => {
            logger.info('Websocket disconnected.');
            dispatcher.send('disconnected', {});
        });

        socket.onError((error) => {
            if (config.refreshToken && !tokenIsRefreshing) {
                tokenIsRefreshing = true;

                config.refreshToken(config.token).then((newToken) => {
                    config.token = newToken;
                    tokenIsRefreshing = false;
                }).catch((error) => {
                    tokenIsRefreshing = false;
                });
            }

            logger.error(`Websocket error: ${error}.`);
            dispatcher.send('error', initError(CONNECTION_ERROR, error));
        });
    };

    // the private channel
    let privateChannel = null;

    const setupPrivateChannel = () => {
        privateChannel = socket.channel('private');

        privateChannel.on('user_updated', (payload) => {
            user = parseOwnUser(payload);
            dispatcher.send('user_updated', user);
        });

        dispatcher.once('connected', () => {
            privateChannel.join()
                .receive('ok', (payload) => {
                    logger.info('Joined the private channel.');

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
                .receive('error', (error) => {
                    dispatcher.send('error', initError(PUSH_REJECTED));
                })
                .receive('timeout', () => {
                    dispatcher.send('error', initError(TIMEOUT));
                });
        });
    };

    const ensureReady = () => {
        if (!ready) {
            throw initError(USAGE_ERROR, 'The Kabelwerk object is not ready yet.');
        }
    };

    return {

        // Update the config.
        //
        config: (newConfig) => {
            for (let key of Object.keys(newConfig)) {
                if (config.hasOwnProperty(key)) {
                    config[key] = newConfig[key];
                }
            }

            logger.setLevel(config.logging);
        },

        // Connect to the Kabelwerk backend.
        //
        connect: () => {
            if (socket) {
                throw initError(USAGE_ERROR, 'Kabewerk.connect was already called once.');
            }

            setupSocket();
            setupPrivateChannel();

            socket.connect();
        },

        // Disconnect the websocket.
        //
        disconnect: () => {
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
        getUser: () => {
            ensureReady();
            return user;
        },

        // Update the connected user's info. Return a promise resolving into
        // the (updated) user info.
        //
        updateUser: (params) => {
            ensureReady();

            return new Promise((resolve, reject) => {
                let push = privateChannel.push('update_user', params);

                push.receive('ok', (payload) => {
                    user = parseOwnUser(payload);
                    resolve(user);
                });

                push.receive('error', () => {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', () => {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Init and return an inbox object.
        //
        openInbox: (params) => {
            ensureReady();
            return initInbox(socket, params);
        },

        // Create a room for the connected user. Return a promise resolving
        // into an object with the newly created room's ID.
        //
        createRoom: (hubId) => {
            ensureReady();

            return new Promise((resolve, reject) => {
                let push = privateChannel.push('create_room', { hub: hubId });

                push.receive('ok', (payload) => {
                    resolve({ id: payload.id });
                });

                push.receive('error', () => {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', () => {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Init and return a room object.
        //
        openRoom: (roomId) => {
            ensureReady();
            return initRoom(socket, roomId);
        },

        // Retrieve info about the user's hub (name, list of fellow hub users).
        // Return a promise resolving into that info.
        //
        // This method only works for hub users.
        //
        loadHubInfo: () => {
            ensureReady();

            return new Promise((resolve, reject) => {
                let push = privateChannel.push('get_hub', {});

                push.receive('ok', (payload) => {
                    resolve(parseOwnHub(payload));
                });

                push.receive('error', () => {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', () => {
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
