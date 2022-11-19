import { initDispatcher } from './dispatcher.js';
import { PushRejected, Timeout, UsageError } from './errors.js';
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
const initRoom = function (socket, user, roomId, callApi) {
    const isHubSide = Boolean(user.hubId);

    const dispatcher = initDispatcher([
        'error',
        'ready',
        'message_posted',
        'message_deleted',
        'marker_moved',
    ]);

    // internal state
    const room = {
        archived: null,
        attributes: null,
        hubUser: null,
        user: null,
    };
    const markers = { own: null, other: null };

    let firstMessageId = null;
    let lastMessageId = null;

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

    const ensureReady = function () {
        if (!ready) {
            throw UsageError('The room object is not ready yet.');
        }
    };

    const ensureHubSide = function () {
        if (!isHubSide) {
            throw UsageError('This method is only available for hub users.');
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
            const message = parseMessage(payload);

            if (message.id > lastMessageId) {
                lastMessageId = message.id;
            }

            dispatcher.send('message_posted', message);
        });

        channel.on('message_deleted', function (payload) {
            const message = parseMessage(payload);
            dispatcher.send('message_deleted', message);
        });

        channel.on('marker_moved', function (payload) {
            const marker = parseMarker(payload);

            if (marker.userId == user.id) {
                markers.own = marker;
                dispatcher.send('marker_moved', marker);
            } else if (
                markers.other == null ||
                markers.other.messageId < marker.messageId
            ) {
                markers.other = marker;
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

                if (ready) {
                    // channel was rejoined

                    for (let message of payload.messages) {
                        dispatcher.send('message_posted', message);
                    }

                    if (
                        payload.markers[0] != null &&
                        (markers.own == null ||
                            markers.own.messageId <
                                payload.markers[0].messageId)
                    ) {
                        markers.own = payload.markers[0];
                        dispatcher.send('marker_moved', markers.own);
                    }

                    if (
                        payload.markers[1] != null &&
                        (markers.other == null ||
                            markers.other.messageId <
                                payload.markers[1].messageId)
                    ) {
                        markers.other = payload.markers[1];
                        dispatcher.send('marker_moved', markers.other);
                    }
                } else {
                    ready = true;

                    markers.own = payload.markers[0];
                    markers.other = payload.markers[1];

                    dispatcher.send('ready', {
                        messages: payload.messages,
                        markers: payload.markers,
                    });
                }
            })
            .receive('error', function (error) {
                logger.error(
                    `Failed to join the ${channel.topic} channel.`,
                    error
                );
                dispatcher.send('error', PushRejected());
            })
            .receive('timeout', function () {
                dispatcher.send('error', Timeout());
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
                throw UsageError(
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
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },

        connect: function () {
            if (channel) {
                throw UsageError(
                    'The connect() method was already called once.'
                );
            }

            setupChannel();
        },

        // Delete a chat message (as long as it belongs to the connected user).
        // Return a promise resolving into the deleted message.
        //
        deleteMessage: function (messageId) {
            try {
                validate(messageId, { type: 'integer' });
            } catch (error) {
                throw UsageError('The message ID must be an integer.');
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('delete_message', { message: messageId })
                    .receive('ok', function (payload) {
                        const message = parseMessage(payload);
                        resolve(message);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to delete the message.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
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

        // Return the room's pair of markers.
        //
        getMarkers: function () {
            ensureReady();
            return [markers.own, markers.other];
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
                return Promise.resolve({ messages: [] });
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
                    reject(PushRejected());
                });

                push.receive('timeout', function () {
                    reject(Timeout());
                });
            });
        },

        // Move the user's marker for the room. Return a promise resolving into
        // the updated marker.
        //
        moveMarker: function (messageId) {
            if (messageId === undefined) {
                if (lastMessageId == null) {
                    throw UsageError(
                        'There must be at least one message in the room before moving the marker.'
                    );
                }
                messageId = lastMessageId;
            }

            try {
                validate(messageId, { type: 'integer' });
            } catch (error) {
                throw UsageError('The message ID must be an integer.');
            }

            return new Promise(function (resolve, reject) {
                channel
                    .push('move_marker', { message: messageId })
                    .receive('ok', function (payload) {
                        const marker = parseMarker(payload);

                        if (
                            markers.own == null ||
                            markers.own.messageId < marker.messageId
                        ) {
                            markers.own = marker;
                        }

                        resolve(marker);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to move the room marker.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
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
                text: { type: 'string', optional: true },
                uploadId: { type: 'integer', optional: true },
            });

            if (params.size != 1) {
                throw UsageError('Exactly one parameter is required.');
            }

            const pushParams = params.has('text')
                ? { text: params.get('text') }
                : { upload: params.get('uploadId') };

            return new Promise(function (resolve, reject) {
                channel
                    .push('post_message', pushParams)
                    .receive('ok', function (payload) {
                        const message = parseMessage(payload);

                        if (message.id > lastMessageId) {
                            lastMessageId = message.id;
                        }

                        resolve(message);
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to post the new message.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },

        // Post a new file upload. Return a promise resolving into the newly
        // created upload.
        //
        postUpload: function (file) {
            const formData = new FormData();
            formData.append('file', file);

            return callApi('POST', `/rooms/${roomId}/uploads`, formData);
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
                    reject(PushRejected());
                });

                push.receive('timeout', function () {
                    reject(Timeout());
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
                throw UsageError('The room attributes must be an object.');
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
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
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
                validate(hubUserId, { type: 'integer', nullable: true });
            } catch (error) {
                throw UsageError('The hub user ID must be an integer.');
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
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },
    };
};

export { initRoom };
