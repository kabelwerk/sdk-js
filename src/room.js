import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, initError } from './errors.js';


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

        // Create a new chat message. Return a promise.
        //
        createMessage: function(text) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('create_message', { text });

                push.receive('ok', function(message) {
                    resolve(message);
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


export { initRoom };
