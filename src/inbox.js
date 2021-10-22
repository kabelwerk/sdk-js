import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, USAGE_ERROR, initError } from './errors.js';
import logger from './logger.js';
import {
    parseHubInbox,
    parseHubInboxRoom,
    parseUserInbox,
    parseUserInboxRoom,
} from './payloads.js';
import { validateParams } from './validators.js';

// Init an inbox object.
//
// An inbox is a certain view on the list of rooms the user has access to.
//
// For hub users, the params object can include the following keys:
//
// - limit
// - archived
// - assignedTo
// - attributes
//
// For end users, only the limit is relevant.
//
// Example usage:
//
//  let inbox = kabel.openInbox({attributes: {country: 'DE'}});
//
//  inbox.once('ready', (rooms) => {});
//  inbox.on('updated', (rooms) => {});
//  inbox.loadMore().then((rooms) => {});
//
const initInbox = function (socket, topic, params = {}) {
    params = validateParams(params, {
        archived: { type: 'boolean', optional: true },
        assignedTo: { type: 'integer', nullable: true, optional: true },
        attributes: { type: 'map', optional: true },
        limit: { type: 'integer', optional: true },
    });

    const isHubSide = topic.startsWith('hub');

    let dispatcher = initDispatcher(['error', 'ready', 'updated']);

    // internal state
    let rooms = new Map(); // room id: room
    let ready = false;

    // the base params (as a map) for the list_rooms pushes
    const loadRoomsParams = (function () {
        let pushParams = new Map();

        pushParams.set('limit', params.has('limit') ? params.get('limit') : 10);
        pushParams.set('offset', 0);

        if (!isHubSide) {
            return pushParams;
        }

        if (params.has('archived')) {
            pushParams.set('archived', params.get('archived'));
        }

        if (params.has('assignedTo')) {
            pushParams.set('hub_user', params.get('assignedTo'));
        }

        if (params.has('attributes')) {
            pushParams.set(
                'attributes',
                Object.fromEntries(params.get('attributes'))
            );
        }

        return pushParams;
    })();

    // helper functions
    const parseInbox = isHubSide ? parseHubInbox : parseUserInbox;
    const parseInboxRoom = isHubSide ? parseHubInboxRoom : parseUserInboxRoom;

    const matchesParams = function (room) {
        if (!isHubSide) {
            return true;
        }

        if (params.has('archived')) {
            if (room.archived !== params.get('archived')) {
                return false;
            }
        }

        if (params.has('assignedTo')) {
            if (room.assignedTo !== params.get('assignedTo')) {
                return false;
            }
        }

        if (params.has('attributes')) {
            for (let [key, value] of params.get('attributes').entries()) {
                if (room.attributes[key] !== value) {
                    return false;
                }
            }
        }

        return true;
    };

    const listRooms = function () {
        let list = Array.from(rooms.values());

        list.sort(function (roomA, roomB) {
            let a = roomA.lastMessage
                ? roomA.lastMessage.insertedAt.getTime()
                : null;
            let b = roomB.lastMessage
                ? roomB.lastMessage.insertedAt.getTime()
                : null;

            return b - a;
        });

        return list;
    };

    // the phoenix channel
    let channel = null;

    const setupChannel = function () {
        channel = socket.channel(topic);

        channel.on('inbox_updated', function (payload) {
            let room = parseInboxRoom(payload);

            if (matchesParams(room)) {
                rooms.set(room.id, room);
            } else if (rooms.has(room.id)) {
                rooms.delete(room.id);
            } else {
                return; // no change in the rooms list
            }

            dispatcher.send('updated', {
                rooms: listRooms(),
            });
        });

        channel
            .join()
            .receive('ok', function () {
                logger.info(`Joined the ${channel.topic} channel.`);
                loadRoomsOnJoin();
            })
            .receive('error', function (error) {
                logger.error(
                    `Failed to join the ${channel.topic} channel.`,
                    error
                );
                dispatcher.send('error', initError(PUSH_REJECTED));
            })
            .receive('timeout', function () {
                dispatcher.send('error', initError(TIMEOUT));
            });
    };

    const loadRoomsOnJoin = function () {
        let pushParams = new Map(loadRoomsParams);

        pushParams.set('offset', 0);

        if (rooms.size > pushParams.get('limit')) {
            pushParams.set('limit', rooms.size);
        }

        channel
            .push('list_rooms', Object.fromEntries(pushParams))
            .receive('ok', function (payload) {
                for (let room of parseInbox(payload).rooms) {
                    rooms.set(room.id, room);
                }

                if (!ready) {
                    ready = true;

                    dispatcher.send('ready', {
                        rooms: listRooms(),
                    });
                } else {
                    dispatcher.send('updated', {
                        rooms: listRooms(),
                    });
                }
            })
            .receive('error', function (error) {
                logger.error("Failed to retrieve the inbox's rooms.", error);
                dispatcher.send('error', initError(PUSH_REJECTED));
            })
            .receive('timeout', function () {
                dispatcher.send('error', initError(TIMEOUT));
            });
    };

    const ensureHubSide = function () {
        if (!isHubSide) {
            throw initError(
                USAGE_ERROR,
                'This method is only available for hub users.'
            );
        }
    };

    return {
        connect: function () {
            if (channel) {
                throw initError(
                    USAGE_ERROR,
                    'The connect() method was already called once.'
                );
            }

            setupChannel();
        },

        disconnect: function () {
            dispatcher.off();

            if (channel) channel.leave();
            channel = null;

            rooms = new Map();
            ready = false;
        },

        // Return the list of rooms stored locally.
        //
        listRooms: listRooms,

        // Load more rooms.
        //
        // Return a promise that either resolves into the list of rooms or
        // rejects with an error.
        //
        loadMore: function () {
            return new Promise(function (resolve, reject) {
                let pushParams = new Map(loadRoomsParams);

                pushParams.set('offset', rooms.size);

                channel
                    .push('list_rooms', Object.fromEntries(pushParams))
                    .receive('ok', function (payload) {
                        for (let room of parseInbox(payload).rooms) {
                            rooms.set(room.id, room);
                        }

                        resolve({
                            rooms: listRooms(),
                        });
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to load more inbox rooms.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
                        reject(initError(TIMEOUT));
                    });
            });
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,

        // Search for rooms by user key and/or name.
        //
        // Returns a promise that either resolves into a list of inbox rooms or
        // rejects with an error.
        //
        search: function (params) {
            ensureHubSide();

            params = validateParams(params, {
                query: { type: 'string' },
                limit: { type: 'integer', optional: true },
                offset: { type: 'integer', optional: true },
            });

            let pushParams = new Map(loadRoomsParams);

            pushParams.set('search_query', params.get('query'));

            pushParams.set(
                'limit',
                params.has('limit') ? params.get('limit') : 10
            );

            pushParams.set(
                'offset',
                params.has('offset') ? params.get('offset') : 0
            );

            return new Promise(function (resolve, reject) {
                channel
                    .push('list_rooms', Object.fromEntries(pushParams))
                    .receive('ok', function (payload) {
                        resolve({
                            rooms: parseInbox(payload).rooms,
                        });
                    })
                    .receive('error', function (error) {
                        logger.error('The room search failed.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
                        reject(initError(TIMEOUT));
                    });
            });
        },
    };
};

export { initInbox };
