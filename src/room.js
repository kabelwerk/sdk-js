import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, initError } from './errors.js';
import logger from './logger.js';
import {
    parseAttributes,
    parseInboxInfo,
    parseMessage,
    parseMessageList
} from './payloads.js';


// Init a room object.
//
// A room object joins and maintains connection to a room channel.
//
const initRoom = function(socket, roomId) {
    let dispatcher = initDispatcher([
        'error',
        'ready',
        'message_posted',
    ]);

    let ready = false;

    let firstMessageId = null;
    let lastMessageId = null;

    const updateFirstLastIds = function(messages) {
        if (messages.length) {
            let lastMessage = messages[messages.length - 1];

            if (!lastMessageId || lastMessage.id > lastMessageId) {
                lastMessageId = lastMessage.id;
            }

            if (!firstMessageId || messages[0].id < firstMessageId) {
                firstMessageId = messages[0].id;
            }
        }
    };

    let channel = socket.channel(`room:${roomId}`, function() {
        let params = {};

        if (lastMessageId) {
            params.after = lastMessageId;
        }

        return params;
    });

    channel.on('message_posted', function(payload) {
        let message = parseMessage(payload);

        if (message.id > lastMessageId) {
            lastMessageId = message.id;
        }

        dispatcher.send('message_posted', message);
    });

    channel.join()
        .receive('ok', function(payload) {
            let messages = parseMessageList(payload).messages;

            if (ready) {  // channel was rejoined
                for (let message of messages) {
                    dispatcher.send('message_posted', message);
                }
            } else {
                ready = true;
                dispatcher.send('ready', {
                    messages: messages,
                });
            }

            updateFirstLastIds(messages);

            logger.info(`Joined the ${channel.topic} channel.`);
        })
        .receive('error', function() {
            dispatcher.send('error', initError(PUSH_REJECTED));
        })
        .receive('timeout', function() {
            dispatcher.send('error', initError(TIMEOUT));
        });

    return {

        // Load more messages, from earlier in the history. Return a promise
        // resolving into the list of fetched messages.
        //
        loadEarlier: function() {
            if (!firstMessageId) {
                return Promise.resolve([]);
            }

            return new Promise(function(resolve, reject) {
                let push = channel.push('list_messages', {
                    before: firstMessageId,
                });

                push.receive('ok', function(payload) {
                    let messages = parseMessageList(payload).messages;

                    updateFirstLastIds(messages);

                    resolve({
                        messages: messages,
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

        // Create a new chat message. Return a promise resolving into the newly
        // created message.
        //
        postMessage: function(params) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('post_message', params);

                push.receive('ok', function(payload) {
                    let message = parseMessage(payload);

                    if (message.id > lastMessageId) {
                        lastMessageId = message.id;
                    }

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

        // Retrieve the room's attributes. Return a promise resolving into the
        // attributes object.
        //
        loadAttributes: function() {
            return new Promise(function(resolve, reject) {
                let push = channel.push('get_attributes', {});

                push.receive('ok', function(payload) {
                    resolve(parseAttributes(payload).attributes);
                });

                push.receive('error', function() {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function() {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Update the room's attributes. Return a promise resolving into the
        // (updated) attributes object.
        //
        updateAttributes: function(attributes) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('set_attributes', { attributes });

                push.receive('ok', function(payload) {
                    resolve(parseAttributes(payload).attributes);
                });

                push.receive('error', function() {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function() {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Retrieve the room's inbox info (attributes, archive status, assigned
        // hub user). Return a promise resolving into this inbox info.
        //
        // This method only works for hub users.
        //
        loadInboxInfo: function() {
            return new Promise(function(resolve, reject) {
                let push = channel.push('get_inbox_info', {});

                push.receive('ok', function(payload) {
                    resolve(parseInboxInfo(payload));
                });

                push.receive('error', function() {
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function() {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Update the room's assigned hub user. Return a promise resolving into
        // an inbox info object.
        //
        // This method only works for hub users.
        //
        assignTo: function(hubUser) {
            return new Promise(function(resolve, reject) {
                let push = channel.push('assign', { hub_user: hubUser });

                push.receive('ok', function(payload) {
                    resolve(parseInboxInfo(payload));
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
