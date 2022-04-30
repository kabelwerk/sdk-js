import { Socket } from 'phoenix';

import { INACTIVE, CONNECTING, ONLINE, initConnector } from './connector.js';
import { initDispatcher } from './dispatcher.js';
import {
    ConnectionError,
    PushRejected,
    Timeout,
    UsageError,
} from './errors.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { initNotifier } from './notifier.js';
import { parseOwnHub, parseOwnUser, parsePrivateJoin } from './payloads.js';
import { initRoom } from './room.js';
import { validate, validateOneOf, validateParams } from './validators.js';
import { VERSION } from './version.js';

// Init a Kabelwerk object.
//
// In production there should be only one Kabelwerk object; however, testing is
// easier when we have a constructor function.
//
const initKabelwerk = function () {
    const config = {
        url: 'wss://hub.kabelwerk.io/socket/user',
        token: '',
        refreshToken: null,
        logging: 'silent',
    };

    const dispatcher = initDispatcher([
        'error',
        'ready',
        'connected',
        'disconnected',
        'user_updated',
    ]);

    let connector = null;
    let user = null;
    let ready = false;

    // the user's private channel
    let privateChannel = null;
    let privateChannelJoinRes = {};

    const setupPrivateChannel = function () {
        privateChannel = connector.getSocket().channel('private', function () {
            const params = {};

            if (config.ensureRooms) {
                params.ensure_rooms = config.ensureRooms;
            }

            return params;
        });

        privateChannel.on('user_updated', function (payload) {
            user = parseOwnUser(payload);
            dispatcher.send('user_updated', user);
        });

        privateChannel
            .join()
            .receive('ok', function (payload) {
                logger.info("Joined the user's private channel.");

                privateChannelJoinRes = parsePrivateJoin(payload);

                if (user) {
                    user = privateChannelJoinRes.user;
                } else {
                    user = privateChannelJoinRes.user;
                    dispatcher.send('user_updated', user);
                }

                if (!ready) {
                    ready = true;
                    dispatcher.send('ready', { user });
                }
            })
            .receive('error', function (error) {
                logger.error(
                    "Failed to join the user's private channel.",
                    error
                );

                dispatcher.send('error', PushRejected());

                // if we cannot (re-)join the private channel, then terminate
                // the connection
                disconnect();
            })
            .receive('timeout', function () {
                dispatcher.send('error', Timeout());
            });
    };

    const ensureReady = function () {
        if (!connector || !ready) {
            throw UsageError('The Kabelwerk object is not ready yet.');
        }
    };

    const disconnect = function () {
        if (privateChannel) privateChannel.leave();
        privateChannel = null;

        if (connector) connector.disconnect();
        connector = null;

        dispatcher.off();

        user = null;
        ready = false;
    };

    return {
        config: function (params) {
            params = validateParams(params, {
                url: { type: 'string', optional: true },
                token: { type: 'string', optional: true },
                refreshToken: { type: 'function', optional: true },
                ensureRooms: {
                    type: 'iterable',
                    optional: true,
                    each: function (hubSlug) {
                        return validate(hubSlug, { type: 'string' });
                    },
                },
                logging: { type: 'string', optional: true },
            });

            for (let [key, value] of params.entries()) {
                config[key] = value;
            }

            logger.setLevel(config.logging);
        },

        // Open a websocket connection to the Kabelwerk backend.
        //
        connect: function () {
            if (connector) {
                const word =
                    connector.getState() == ONLINE ? 'online' : 'connecting';
                throw UsageError(`Kabewerk is already ${word}.`);
            }

            connector = initConnector(config, dispatcher);

            dispatcher.once('connected', setupPrivateChannel);

            connector.connect();
        },

        // Create a room for the connected user. Return a promise resolving
        // into an object with the newly created room's ID.
        //
        createRoom: function (hubIdOrSlug) {
            ensureReady();

            try {
                validateOneOf(hubIdOrSlug, [
                    { type: 'integer' },
                    { type: 'string' },
                ]);
            } catch (error) {
                throw UsageError('The hub ID must be an integer or a string.');
            }

            return new Promise(function (resolve, reject) {
                privateChannel
                    .push('create_room', { hub: hubIdOrSlug })
                    .receive('ok', function (payload) {
                        resolve({ id: payload.id });
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to create a new room.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },

        // Close the currently active websocket connection to the backend and
        // reset the internal state.
        //
        disconnect: disconnect,

        // Return the current connection state.
        //
        getState: function () {
            if (connector) {
                return connector.getState();
            } else {
                return INACTIVE;
            }
        },

        // Return the connected user's info.
        //
        getUser: function () {
            ensureReady();
            return user;
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
                    reject(PushRejected());
                });

                push.receive('timeout', function () {
                    reject(Timeout());
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
            return initInbox(connector.getSocket(), user, params);
        },

        // Init and return a notifier object.
        //
        openNotifier: function () {
            ensureReady();
            return initNotifier(connector.getSocket(), user);
        },

        // Init and return a room object.
        //
        openRoom: function (roomId = 0) {
            ensureReady();

            try {
                validate(roomId, { type: 'integer' });
            } catch (error) {
                throw UsageError('The room ID must be an integer.');
            }

            if (roomId == 0) {
                if (privateChannelJoinRes.roomIds.length) {
                    roomId = privateChannelJoinRes.roomIds[0];
                } else {
                    throw UsageError('The user does not have any rooms.');
                }
            }

            return initRoom(connector.getSocket(), user, roomId);
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
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },

        // connection states
        INACTIVE,
        CONNECTING,
        ONLINE,

        // SDK version
        VERSION,
    };
};

export { initKabelwerk };
