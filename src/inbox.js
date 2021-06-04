import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, initError } from './errors.js';
import { parseInbox, parseInboxRoom } from './payloads.js';
import logger from './logger.js';


// Init an inbox object.
//
// An inbox is a certain view on the list of rooms the user has access to.
//
// For hub users, the params object can include the following keys:
//
// - limit
// - attributes
// - hubUser
// - archived
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
const initInbox = function(channel, params) {
    params = Object.assign({
        limit: 100,
        attributes: null,
        hubUser: null,
        archived: false,
    }, params);

    let rooms = new Map();  // room id: room

    let dispatcher = initDispatcher([
        'error',
        'ready',
        'updated',
    ]);

    const pushParams = function() {
        let pushParams = {
            limit: params.limit,
            offset: rooms.size,
            archived: params.archived,
        };
        if (params.attributes) {
            pushParams.attributes = params.attributes;
        }
        if (params.hubUser) {
            pushParams.hub_user = params.hubUser;
        }
        return pushParams;
    };

    const listRooms = function() {
        let list = Array.from(rooms.values());

        list.sort(function(a, b) {
            return b.lastMessage.insertedAt.getTime() - a.lastMessage.insertedAt.getTime();
        });

        return list;
    };

    channel.on('inbox_updated', function(payload) {
        let room = parseInboxRoom(payload);

        rooms.set(room.id, room);
        dispatcher.send('updated', listRooms());
    });

    channel
        .push('list_rooms', pushParams())
        .receive('ok', function(payload) {
            for (let room of parseInbox(payload).rooms) {
                rooms.set(room.id, room);
            }
            dispatcher.send('ready', listRooms());
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
                let push = channel.push('list_rooms', pushParams());

                push.receive('ok', function(payload) {
                    for (let room of parseInbox(payload).rooms) {
                        rooms.set(room.id, room);
                    }
                    resolve(listRooms());
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
