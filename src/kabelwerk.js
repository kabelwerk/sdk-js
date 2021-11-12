import { Socket } from 'phoenix';

import { initDispatcher } from './dispatcher.js';
import {
    CONNECTION_ERROR,
    PUSH_REJECTED,
    TIMEOUT,
    USAGE_ERROR,
    initError,
} from './errors.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { parseOwnHub, parseOwnUser } from './payloads.js';
import { initRoom } from './room.js';
import { validate, validateParams } from './validators.js';
import { VERSION } from './version.js';

// Init a Kabelwerk object.
//
// In production there should be only one Kabelwerk object; however, testing is
// easier when we have a constructor function.
//
const initKabelwerk = function () {
    let config = {
        url: 'wss://hub.kabelwerk.io/socket/user',
        token: '',
        refreshToken: null,
        logging: 'silent',
    };

    let dispatcher = initDispatcher([
        'error',
        'ready',
        'connected',
        'disconnected',
        'reconnected',
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
                return {
                    token: config.token,
                    agent: `sdk-js/${VERSION}`,
                };
            },
            logger: function (kind, msg, data) {
                logger.debug(`${kind}: ${msg}`, data);
            },
        });

        socket.onOpen(function () {
            logger.info('Websocket connected.');

            if (ready) {
                dispatcher.send('reconnected', {});
            } else {
                dispatcher.send('connected', {});
            }
        });

        socket.onClose(function (event) {
            logger.info('Websocket disconnected.', event);
            dispatcher.send('disconnected', {});
        });

        socket.onError(function (error) {
            logger.error('Websocket error.', error);
            dispatcher.send('error', initError(CONNECTION_ERROR, error));

            if (config.refreshToken && !tokenIsRefreshing) {
                tokenIsRefreshing = true;

                config
                    .refreshToken(config.token)
                    .then(function (newToken) {
                        logger.info('Auth token refreshed.');
                        config.token = newToken;
                        tokenIsRefreshing = false;
                    })
                    .catch(function (error) {
                        logger.error('Failed to refresh auth token.', error);
                        tokenIsRefreshing = false;
                    });
            }
        });
    };

    // the user's private channel
    let privateChannel = null;

    const setupPrivateChannel = function () {
        privateChannel = socket.channel('private');

        privateChannel.on('user_updated', function (payload) {
            user = parseOwnUser(payload);
            dispatcher.send('user_updated', user);
        });

        dispatcher.once('connected', function () {
            privateChannel
                .join()
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
                    logger.error(
                        "Failed to join the user's private channel.",
                        error
                    );
                    dispatcher.send('error', initError(PUSH_REJECTED));
                })
                .receive('timeout', function () {
                    dispatcher.send('error', initError(TIMEOUT));
                });
        });
    };

    const ensureReady = function () {
        if (!ready) {
            throw initError(
                USAGE_ERROR,
                'The Kabelwerk object is not ready yet.'
            );
        }
    };

    return {
        config: function (params) {
            params = validateParams(params, {
                url: { type: 'string', optional: true },
                token: { type: 'string', optional: true },
                refreshToken: {
                    type: 'function',
                    nullable: true,
                    optional: true,
                },
                logging: { type: 'string', optional: true },
            });

            for (let [key, value] of params.entries()) {
                config[key] = value;
            }

            logger.setLevel(config.logging);
        },

        connect: function () {
            if (socket) {
                throw initError(
                    USAGE_ERROR,
                    'Kabewerk.connect() was already called once.'
                );
            }

            setupSocket();
            setupPrivateChannel();

            socket.connect();
        },

        // Create a room for the connected user. Return a promise resolving
        // into an object with the newly created room's ID.
        //
        createRoom: function (hubId) {
            ensureReady();

            try {
                validate(hubId, { type: 'integer' });
            } catch (error) {
                throw initError(USAGE_ERROR, 'The hub ID must be an integer.');
            }

            return new Promise(function (resolve, reject) {
                privateChannel
                    .push('create_room', { hub: hubId })
                    .receive('ok', function (payload) {
                        resolve({ id: payload.id });
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to create a new room.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
                        reject(initError(TIMEOUT));
                    });
            });
        },

        disconnect: function () {
            dispatcher.off();

            if (privateChannel) privateChannel.leave();
            privateChannel = null;

            if (socket) socket.disconnect();
            socket = null;

            user = null;
            ready = false;
        },

        // Return the connected user's info.
        //
        getUser: function () {
            ensureReady();
            return user;
        },

        isConnected: function () {
            return Boolean(socket && socket.isConnected());
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

        off: dispatcher.off,
        on: dispatcher.on,
        once: dispatcher.once,

        // Init and return an inbox object.
        //
        // The params are validated by the inbox object.
        //
        openInbox: function (params) {
            ensureReady();
            return initInbox(socket, user, params);
        },

        // Init and return a room object.
        //
        openRoom: function (roomId) {
            ensureReady();

            try {
                validate(roomId, { type: 'integer' });
            } catch (error) {
                throw initError(USAGE_ERROR, 'The room ID must be an integer.');
            }

            return initRoom(socket, user, roomId);
        },

        // Update the connected user's info. Return a promise resolving into
        // the (updated) user info.
        //
        updateUser: function (params) {
            ensureReady();

            params = validateParams(params, {
                name: { type: 'string', optional: true },
            });

            return new Promise(function (resolve, reject) {
                privateChannel
                    .push('update_user', Object.fromEntries(params))
                    .receive('ok', function (payload) {
                        user = parseOwnUser(payload);
                        resolve(user);
                    })
                    .receive('error', function (error) {
                        logger.error(
                            "Failed to update the user's info.",
                            error
                        );
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
                        reject(initError(TIMEOUT));
                    });
            });
        },

        VERSION: VERSION,
    };
};

export { initKabelwerk };
