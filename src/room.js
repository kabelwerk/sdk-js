import { initDispatcher } from './dispatcher.js';
import { PUSH_REJECTED, TIMEOUT, USAGE_ERROR, initError } from './errors.js';
import logger from './logger.js';
import {
    parseHubRoom,
    parseHubRoomJoin,
    parseMarker,
    parseMessage,
    parseMessages,
    parseRoom,
    parseRoomJoin,
} from './payloads.js';
import { validate, validateParams } from './validators.js';

// Init a room object.
//
// A room object joins and maintains connection to a room channel.
//
const initRoom = function (socket, user, roomId) {
    const isHubSide = Boolean(user.hubId);

    let dispatcher = initDispatcher([
        'error',
        'ready',
        'marker_moved',
        'message_posted',
    ]);

    // internal state
    let room = {
        archived: null,
        attributes: null,
        hubUser: null,
        user: null,
    };
    let firstMessageId = null;
    let lastMessageId = null;
    let marker = null;
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
        room.user = payload.user;
        room.attributes = payload.attributes;

        if (isHubSide) {
            if ('archived' in payload) {
                room.archived = payload.archived;
            }
            if ('hubUser' in payload) {
                room.hubUser = payload.hubUser;
            }
        }
    };

    const updateMarker = function (incoming) {
        let hasChanged = false;

        if (incoming && incoming.userId == user.id) {
            marker = {
                messageId: incoming.messageId,
                updatedAt: incoming.updatedAt,
            };
            hasChanged = true;
        }

        return hasChanged;
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

        channel.on('marker_moved', function (payload) {
            if (updateMarker(parseMarker(payload))) {
                dispatcher.send('marker_moved', marker);
            }
        });

        channel
            .join()
            .receive('ok', function (payload) {
                logger.info(`Joined the ${channel.topic} channel.`);

                const parse = isHubSide ? parseHubRoomJoin : parseRoomJoin;

                payload = parse(payload);

                updateRoom(payload);
                updateFirstLastIds(payload.messages);

                const markerChanged = updateMarker(payload.marker);

                if (ready) {
                    // channel was rejoined

                    for (let message of payload.messages) {
                        dispatcher.send('message_posted', message);
                    }

                    if (markerChanged) {
                        dispatcher.send('marker_moved', marker);
                    }
                } else {
                    ready = true;

                    dispatcher.send('ready', {
                        messages: payload.messages,
                        marker: payload.marker,
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

            try {
                validate(until, { type: 'datetime', nullable: true });
            } catch (error) {
                throw initError(
                    USAGE_ERROR,
                    "The parameter 'until' must be either a valid datetime or null."
                );
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('set_inbox_info', { archive: true, until: until })
                    .receive('ok', function (payload) {
                        payload = parseHubRoom(payload);
                        updateRoom(payload);
                        resolve(payload);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to archive the room.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
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
            return room.attributes;
        },

        // Return the room's assigned hub user.
        //
        getHubUser: function () {
            ensureReady();
            ensureHubSide();
            return room.hubUser;
        },

        // Return the connected user's marker for the room.
        //
        getMarker: function () {
            ensureReady();
            return marker;
        },

        // Return the room's user.
        //
        getUser: function () {
            ensureReady();
            return room.user;
        },

        // Return a boolean indicating whether the room is marked as archived.
        //
        isArchived: function () {
            ensureReady();
            ensureHubSide();
            return room.archived;
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

        // Move the user's marker for the room. Return a promise resolving into
        // the updated marker.
        //
        moveMarker: function (messageId) {
            try {
                validate(messageId, { type: 'integer' });
            } catch (error) {
                throw initError(
                    USAGE_ERROR,
                    "The parameter 'messageId' must be an integer."
                );
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('move_marker', { message: messageId })
                    .receive('ok', function (payload) {
                        updateMarker(parseMarker(payload));
                        resolve(marker);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to move the room marker.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
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
            params = validateParams(params, {
                text: { type: 'string' },
            });

            return new Promise(function (resolve, reject) {
                channel
                    .push('post_message', Object.fromEntries(params))
                    .receive('ok', function (payload) {
                        let message = parseMessage(payload);

                        if (message.id > lastMessageId) {
                            lastMessageId = message.id;
                        }

                        resolve(message);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to post the new message.', error);
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
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
            try {
                attributes = validate(attributes, { type: 'map' });
            } catch (error) {
                throw initError(
                    USAGE_ERROR,
                    'The room attributes must be an object.'
                );
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('set_attributes', {
                        attributes: Object.fromEntries(attributes),
                    })
                    .receive('ok', function (payload) {
                        payload = parseRoom(payload);
                        updateRoom(payload);
                        resolve(payload.attributes);
                    })
                    .receive('error', function (error) {
                        logger.error(
                            "Failed to update the room's attributes.",
                            error
                        );
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
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

            try {
                validate(hubUserId, { type: 'integer' });
            } catch (error) {
                throw initError(
                    USAGE_ERROR,
                    'The hub user ID must be an integer.'
                );
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('set_inbox_info', { hub_user: hubUserId })
                    .receive('ok', function (payload) {
                        payload = parseHubRoom(payload);
                        updateRoom(payload);
                        resolve(payload);
                    })
                    .receive('error', function (error) {
                        logger.error(
                            "Failed to update the room's assigned hub user.",
                            error
                        );
                        reject(initError(PUSH_REJECTED));
                    })
                    .receive('timeout', function () {
                        reject(initError(TIMEOUT));
                    });
            });
        },
    };
};

export { initRoom };
