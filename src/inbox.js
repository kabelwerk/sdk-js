import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, initError } from './errors.js';
import {
    parseHubInbox,
    parseHubInboxRoom,
    parseUserInbox,
    parseUserInboxRoom
} from './payloads.js';
import logger from './logger.js';


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
const initInbox = function(channel, params = {}) {
    const isHubInbox = channel.topic.startsWith('hub');

    let rooms = new Map();  // room id: room

    let dispatcher = initDispatcher([
        'error',
        'ready',
        'updated',
    ]);

    const parseInbox = isHubInbox ? parseHubInbox : parseUserInbox;
    const parseInboxRoom = isHubInbox ? parseHubInboxRoom : parseUserInboxRoom;

    const inferPushParams = function() {
        let pushParams = {
            limit: 'limit' in params ? params.limit : 10,
            offset: rooms.size,
        };

        if (!isHubInbox) {
            return pushParams;
        }

        if ('archived' in params) {
            pushParams.archived = params.archived;
        }

        if ('assignedTo' in params) {
            pushParams.hub_user = params.assignedTo;
        }

        if ('attributes' in params) {
            pushParams.attributes = params.attributes;
        }

        return pushParams;
    };

    const listRooms = function() {
        let list = Array.from(rooms.values());

        list.sort(function(roomA, roomB) {
            let a = roomA.lastMessage ? roomA.lastMessage.insertedAt.getTime() : null;
            let b = roomB.lastMessage ? roomB.lastMessage.insertedAt.getTime() : null;

            return b - a;
        });

        return list;
    };

    channel.on('inbox_updated', function(payload) {
        let room = parseInboxRoom(payload);

        if (isHubInbox) {
            if ('archived' in params) {
                if (room.archived !== params.archived) {
                    return;
                }
            }

            if ('assignedTo' in params) {
                if (room.assignedTo !== params.assignedTo) {
                    return;
                }
            }

            if ('attributes' in params) {
                for (let key of Object.keys(params.attributes)) {
                    if (room.attributes[key] !== params.attributes[key]) {
                        return;
                    }
                }
            }
        }

        rooms.set(room.id, room);

        dispatcher.send('updated', {
            rooms: listRooms(),
        });
    });

    channel
        .push('list_rooms', inferPushParams())
        .receive('ok', function(payload) {
            for (let room of parseInbox(payload).rooms) {
                rooms.set(room.id, room);
            }

            dispatcher.send('ready', {
                rooms: listRooms(),
            });
        })
        .receive('error', function() {
            dispatcher.send('error', initError(PUSH_REJECTED));
        })
        .receive('timeout', function() {
            dispatcher.send('error', initError(TIMEOUT));
        });

    return {
        listRooms: listRooms,

        // Load more rooms.
        //
        // Return a promise that either resolves into the list of rooms or
        // rejects into an error.
        //
        loadMore: function() {
            return new Promise(function(resolve, reject) {
                let push = channel.push('list_rooms', inferPushParams());

                push.receive('ok', function(payload) {
                    for (let room of parseInbox(payload).rooms) {
                        rooms.set(room.id, room);
                    }

                    resolve({
                        rooms: listRooms(),
                    });
                });

                push.receive('error', function() {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function() {
                    reject(initError(TIMEOUT));
                });
            });
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};


export { initInbox };
