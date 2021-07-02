import { Socket } from 'phoenix';

import { initDispatcher } from './dispatcher.js';
import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT, USAGE_ERROR, initError } from './errors.js';
import { initInbox } from './inbox.js';
import logger from './logger.js';
import { parseOwnUser } from './payloads.js';
import { initRoom } from './room.js';


// Init a Phoenix socket object.
//
// Helper for the kabel object (see below).
//
const initSocket = function(url, token, dispatcher) {
    let socket = new Socket(url, {params: { token }});

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


// Init a user object.
//
// The user object opens and maintains the connected user's private channel,
// and from there retrieving and updating the user's info.
//
// Helper for the kabel object (see below).
//
const initUser = function(socket, dispatcher) {
    let user = null;

    let channel = socket.channel('private');

    channel.join()
        .receive('ok', function(payload) {
            user = parseOwnUser(payload);
            dispatcher.send('user_loaded', user);
            logger.info('Joined the private channel.');
        })
        .receive('error', function() {
            dispatcher.send('error', initError(PUSH_REJECTED));
        })
        .receive('timeout', function() {
            dispatcher.send('error', initError(TIMEOUT));
        });

    channel.on('user_updated', function(payload) {
        user = parseOwnUser(payload);
        dispatcher.send('user_updated', user);
    });

    return {
        getInfo: function() {
            return user;
        },

        updateInfo: function(params) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('update_user', params);

                push.receive('ok', function(payload) {
                    user = parseOwnUser(payload);
                    resolve(user);
                });

                push.receive('error', function() {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function() {
                    reject(initError(TIMEOUT));
                });
            });
        },
    };
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
        'user_updated',
    ]);

    // step 1: connect to the websocket
    let socket = initSocket(url, token, dispatcher);

    // step 2: join the user's private channel
    let user = null;

    dispatcher.once('connected', function() {
        user = initUser(socket, dispatcher);
    });

    // step 3: join the user's inbox channel
    let inboxChannel = null;

    dispatcher.once('user_loaded', function(user) {
        if (user.hubId) {
            inboxChannel = socket.channel(`hub_inbox:${user.hubId}`);
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

    const ensureReady = function() {
        if (!ready) {
            throw initError(USAGE_ERROR, 'The kabel object is not ready yet.');
        }
    };

    return {

        // Returns the connected user's info.
        //
        getUser: function() {
            ensureReady();
            return user.getInfo();
        },

        // Update the connected user's info. Return a promise.
        //
        updateUser: function(params) {
            ensureReady();
            return user.updateInfo(params);
        },

        // Init and return an inbox object.
        //
        openInbox: function(params) {
            ensureReady();
            return initInbox(inboxChannel, params);
        },

        // Init and return a room object.
        //
        openRoom: function(id) {
            ensureReady();
            return initRoom(socket, id);
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};


export { initKabel };
