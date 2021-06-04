import phoenix from 'phoenix';

import { initDispatcher } from './dispatcher.js';
import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT, USAGE_ERROR, initError } from './errors.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { parseUser } from './payloads.js';
import { initRoom } from './room.js';


// Init a Phoenix socket object.
//
// Helper for the initKabel factory below.
//
const initSocket = function(url, token, dispatcher) {
    let socket = new phoenix.Socket(url, {params: { token }});

    socket.onOpen(function() {
        logger.info('Websocket connected.');
        dispatcher.send('connected', {});
    });

    socket.onClose(function() {
        logger.info('Websocket disconnected.');
        dispatcher.send('disconnected', {});
    });

    socket.onError(function(error) {
        logger.error(`Websocket error: ${error}.`);
        dispatcher.send('error', initError(CONNECTION_ERROR, error));
    });

    socket.connect();

    return socket;
};


// Init a kabel object.
//
// The kabel object opens and maintains the Phoenix socket. It also joins and
// manages the user's private and inbox channels.
//
// Example usage:
//
//  let kabel = initKabel(url, token);
//
//  kabel.on('connected', () => { console.log('hooray!') });
//  kabel.on('error', (error) => { console.error(error) });
//
//  kabel.once('ready', function() {
//      let inbox = kabel.openInbox();
//      let room = kabel.openRoom(42);
//  });
//
const initKabel = function(url, token) {
    let ready = false;

    let dispatcher = initDispatcher([
        'connected',
        'disconnected',
        'error',
        'ready',
        'user_loaded',
    ]);

    // step 1: connect to the websocket
    let socket = initSocket(url, token, dispatcher);

    // step 2: join the user's private channel
    let privateChannel = null;

    dispatcher.once('connected', function() {
        privateChannel = socket.channel('private');

        privateChannel.join()
            .receive('ok', function(payload) {
                let user = parseUser(payload);
                dispatcher.send('user_loaded', user);
                logger.info('Joined the private channel.');
            })
            .receive('error', function() {
                dispatcher.send('error', initError(PUSH_REJECTED));
            })
            .receive('timeout', function() {
                dispatcher.send('error', initError(TIMEOUT));
            });
    });

    // step 3: join the user's inbox channel
    let inboxChannel = null;

    dispatcher.once('user_loaded', function(user) {
        if (user.hub_id) {
            inboxChannel = socket.channel(`hub_inbox:${user.hub_id}`);
        } else {
            inboxChannel = socket.channel(`user_inbox:${user.id}`);
        }

        inboxChannel.join()
            .receive('ok', function() {
                if (!ready) {
                    ready = true;
                    dispatcher.send('ready', {});
                }

                logger.info(`Joined the ${inboxChannel.topic} channel.`);
            })
            .receive('error', function() {
                dispatcher.send('error', initError(PUSH_REJECTED));
            })
            .receive('timeout', function() {
                dispatcher.send('error', initError(TIMEOUT));
            });
    });

    return {

        // Init and return an inbox object.
        //
        // Throw an error if the kabel object is not ready yet.
        //
        openInbox: function(params) {
            if (!ready) {
                throw initError(USAGE_ERROR, 'The kabel object is not ready yet.');
            }

            return initInbox(inboxChannel, params);
        },

        // Init and return a room object.
        //
        // Throw an error if the kabel object is not ready yet.
        //
        openRoom: function(id) {
            if (!ready) {
                throw initError(USAGE_ERROR, 'The kabel object is not ready yet.');
            }

            return initRoom(socket, id);
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};


export { initKabel };
