import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, initError } from './errors.js';
import logger from './logger.js';


// Init an inbox object.
//
// An inbox is a certain view on the list of rooms the user has access to.
//
// Example usage:
//
//  let inbox = kabel.openInbox();
//  inbox.listRooms().then((rooms) => { console.log(rooms) });
//  inbox.on('changed', (rooms) => { console.log(rooms) });
//
const initInbox = function(channel, params) {
    let dispatcher = initDispatcher([
        'changed',
    ]);

    channel.on('message_created', function(message) {
        logger.info(message);
    });

    return {

        // Retrieve a list of rooms.
        //
        listRooms: function(pagination) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('list_rooms');

                push.receive('ok', function(rooms) {
                    resolve(rooms);
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
