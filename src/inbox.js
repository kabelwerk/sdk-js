import { initDispatcher } from './dispatcher.js';
import logger from './logger.js';


// Init an inbox object.
//
// An inbox is a certain view on the list of rooms the user has access to.
//
// Example usage:
//
//  let inbox = kabel.openInbox();
//  inbox.listRooms();
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
            channel.push('list_rooms');
        },

        on: dispatcher.on,
        off: dispatcher.off,
    };
};


export { initInbox };
