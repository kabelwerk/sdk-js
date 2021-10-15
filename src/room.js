import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, USAGE_ERROR, initError } from './errors.js';
import logger from './logger.js';
import {
    parseHubRoom,
    parseHubRoomJoin,
    parseMessage,
    parseMessages,
    parseRoom,
    parseRoomJoin,
} from './payloads.js';

// Init a room object.
//
// A room object joins and maintains connection to a room channel.
//
const initRoom = function (socket, roomId, isHubSide = false) {
    let dispatcher = initDispatcher(['error', 'ready', 'message_posted']);

    // internal state
    let firstMessageId = null;
    let lastMessageId = null;
    let attributes = null;
    let user = null;
    let hubUser = null;
    let archived = null;
    let ready = false;

    // helper functions
    const updateFirstLastIds = function (messages) {
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

    const updateRoom = function (payload) {
        user = payload.user;
        attributes = payload.attributes;

        if (isHubSide) {
            if ('archived' in payload) {
                archived = payload.archived;
            }
            if ('hubUser' in payload) {
                hubUser = payload.hubUser;
            }
        }
    };

    const ensureReady = function () {
        if (!ready) {
            throw initError(USAGE_ERROR, 'The room object is not ready yet.');
        }
    };

    const ensureHubSide = function () {
        if (!isHubSide) {
            throw initError(
                USAGE_ERROR,
                'This method is only available for hub users.'
            );
        }
    };

    // the phoenix channel
    let channel = null;

    const setupChannel = function () {
        channel = socket.channel(`room:${roomId}`, function () {
            let params = {};

            if (lastMessageId) {
                params.after = lastMessageId;
            }

            return params;
        });

        channel.on('message_posted', function (payload) {
            let message = parseMessage(payload);

            if (message.id > lastMessageId) {
                lastMessageId = message.id;
            }

            dispatcher.send('message_posted', message);
        });

        channel
            .join()
            .receive('ok', function (payload) {
                logger.info(`Joined the ${channel.topic} channel.`);

                const parse = isHubSide ? parseHubRoomJoin : parseRoomJoin;

                payload = parse(payload);

                updateRoom(payload);
                updateFirstLastIds(payload.messages);

                if (ready) {
                    // channel was rejoined
                    for (let message of payload.messages) {
                        dispatcher.send('message_posted', message);
                    }
                } else {
                    ready = true;
                    dispatcher.send('ready', {
                        messages: payload.messages,
                    });
                }
            })
            .receive('error', function (error) {
                logger.error(
                    `Failed to join the ${channel.topic} channel.`,
                    error
                );
                dispatcher.send('error', initError(PUSH_REJECTED));
            })
            .receive('timeout', function () {
                dispatcher.send('error', initError(TIMEOUT));
            });
    };

    return {
        // Update the room's inbox status to archived. Return a promise
        // resolving into an inbox info object.
        //
        // If until is set to a future Date object, the room will be
        // automatically un-archived at that point in time; by default the room
        // will not move out of the archive on its own.
        //
        // This method only works for hub users.
        //
        archive: function (until = null) {
            ensureHubSide();

            return new Promise(function (resolve, reject) {
                let push = channel.push('set_inbox_info', {
                    archive: true,
                    until: until,
                });

                push.receive('ok', function (payload) {
                    payload = parseHubRoom(payload);
                    updateRoom(payload);
                    resolve(payload);
                });

                push.receive('error', function (error) {
                    logger.error('Failed to archive the room.', error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        connect: function () {
            if (channel) {
                throw initError(
                    USAGE_ERROR,
                    'The connect() method was already called once.'
                );
            }

            setupChannel();
        },

        disconnect: function () {
            dispatcher.off();

            if (channel) channel.leave();
            channel = null;

            firstMessageId = null;
            lastMessageId = null;
            ready = false;
        },

        // Return the room's attributes.
        //
        getAttributes: function () {
            ensureReady();
            return attributes;
        },

        // Return the room's assigned hub user.
        //
        getHubUser: function () {
            ensureReady();
            ensureHubSide();
            return hubUser;
        },

        // Return the room's user.
        //
        getUser: function () {
            ensureReady();
            return user;
        },

        // Return a boolean indicating whether the room is marked as archived.
        //
        isArchived: function () {
            ensureReady();
            ensureHubSide();
            return archived;
        },

        // Load more messages, from earlier in the history. Return a promise
        // resolving into the list of fetched messages.
        //
        loadEarlier: function () {
            if (!firstMessageId) {
                return Promise.resolve([]);
            }

            return new Promise(function (resolve, reject) {
                let push = channel.push('list_messages', {
                    before: firstMessageId,
                });

                push.receive('ok', function (payload) {
                    let messages = parseMessages(payload).messages;

                    updateFirstLastIds(messages);

                    resolve({
                        messages: messages,
                    });
                });

                push.receive('error', function (error) {
                    logger.error('Failed to load earlier messages.', error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        off: dispatcher.off,
        on: dispatcher.on,
        once: dispatcher.once,

        // Create a new chat message. Return a promise resolving into the newly
        // created message.
        //
        postMessage: function (params) {
            return new Promise(function (resolve, reject) {
                let push = channel.push('post_message', params);

                push.receive('ok', function (payload) {
                    let message = parseMessage(payload);

                    if (message.id > lastMessageId) {
                        lastMessageId = message.id;
                    }

                    resolve(message);
                });

                push.receive('error', function (error) {
                    logger.error('Failed to post the new message.', error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Update the room's inbox status to not archived. Return a promise
        // resolving into an inbox info object.
        //
        // This method only works for hub users.
        //
        unarchive: function () {
            ensureHubSide();

            return new Promise(function (resolve, reject) {
                let push = channel.push('set_inbox_info', { archive: false });

                push.receive('ok', function (payload) {
                    payload = parseHubRoom(payload);
                    updateRoom(payload);
                    resolve(payload);
                });

                push.receive('error', function (error) {
                    logger.error('Failed to unarchive the room.', error);
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Update the room's attributes. Return a promise resolving into the
        // (updated) attributes object.
        //
        updateAttributes: function (attributes) {
            return new Promise(function (resolve, reject) {
                let push = channel.push('set_attributes', { attributes });

                push.receive('ok', function (payload) {
                    payload = parseRoom(payload);
                    updateRoom(payload);
                    resolve(payload.attributes);
                });

                push.receive('error', function (error) {
                    logger.error(
                        "Failed to update the room's attributes.",
                        error
                    );
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },

        // Update the room's assigned hub user. Return a promise resolving into
        // an inbox info object.
        //
        // This method only works for hub users.
        //
        updateHubUser: function (hubUserId) {
            ensureHubSide();

            return new Promise(function (resolve, reject) {
                let push = channel.push('set_inbox_info', {
                    hub_user: hubUserId,
                });

                push.receive('ok', function (payload) {
                    payload = parseHubRoom(payload);
                    updateRoom(payload);
                    resolve(payload);
                });

                push.receive('error', function (error) {
                    logger.error(
                        "Failed to update the room's assigned hub user.",
                        error
                    );
                    reject(initError(PUSH_REJECTED));
                });

                push.receive('timeout', function () {
                    reject(initError(TIMEOUT));
                });
            });
        },
    };
};

export { initRoom };
