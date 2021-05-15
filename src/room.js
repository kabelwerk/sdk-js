import { initDispatcher } from './dispatcher.js';


// Init a room object.
//
// A room object joins and maintains connection to a room channel.
//
const initRoom = function(socket, roomId) {
    let dispatcher = initDispatcher([
        'message_created',
    ]);

    let channel = socket.channel(`room:${roomId}`);

    channel.on('message_created', function(message) {
        dispatcher.send('message_created', message);
    });

    channel.join();

    return {
        createMessage: function(text) {
            channel.push('create_message', { text });
        },

        on: dispatcher.on,
        off: dispatcher.off,
    };
};


export { initRoom };
