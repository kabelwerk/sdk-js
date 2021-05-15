import { Socket } from 'phoenix';

import { initDispatcher } from './dispatcher.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { initRoom } from './room.js';


// Init a Phoenix socket object.
//
// Helper for the initKabel factory below.
//
const initSocket = function(url, token, dispatcher) {
    let socket = new Socket(url, {params: { token }});

    socket.onOpen(function() {
        logger.info("Websocket connected.");
        dispatcher.send('connected', {});
    });

    socket.onClose(function() {
        logger.info("Websocket disconnected.");
        dispatcher.send('disconnected', {});
    });

    socket.onError(function(error) {
        logger.error(error);
        dispatcher.send('error', { error });
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
//  let kabel = initKabel({});
//
//  kabel.on('connected', () => { console.log('hooray!') });
//  kabel.on('error', (error) => { console.error(error) });
//
//  kabel.on('ready', function() {
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
    let userChannel = null;
    let user = null;

    dispatcher.once('connected', function() {
        userChannel = socket.channel('private');

        userChannel.join()
            .receive('ok', function(payload) {
                logger.info("Joined the user's private channel.");
                user = payload;
                dispatcher.send('user_loaded');
            })
            .receive('error', function(error) {
                logger.error(error);
                dispatcher.send('error', { error });
            });
    });

    // step 3: join the user's inbox channel
    let inboxChannel = null;

    dispatcher.once('user_loaded', function() {
        if (user.hub_id) {
            inboxChannel = socket.channel(`hub_inbox:${user.hub_id}`);
        } else {
            inboxChannel = socket.channel(`user_inbox:${user.id}`);
        }

        inboxChannel.join()
            .receive('ok', function() {
                logger.info("Joined the user's inbox channel.");
                logger.info("Kabel ready.");
                ready = true;
                dispatcher.send('ready');
            })
            .receive('error', function(error) {
                logger.error(error);
                dispatcher.send('error', { error });
            });
    });

    return {

        // Init and return an inbox object.
        //
        // Throw an error if the kabel object is not ready yet.
        //
        openInbox: function(params) {
            if (!ready) {
                let message = 'The kabel object is not ready yet.';
                throw new Error(message);
            }

            return initInbox(inboxChannel, params);
        },

        // Init and return a room object.
        //
        // Throw an error if the kabel object is not ready yet.
        //
        openRoom: function(id) {
            if (!ready) {
                let message = 'The kabel object is not ready yet.';
                throw new Error(message);
            }

            return initRoom(socket, id);
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};


export { initKabel };
