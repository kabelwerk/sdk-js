import { initDispatcher } from './dispatcher.js';
import { PushRejected, Timeout, UsageError } from './errors.js';
import logger from './logger.js';
import {
    parseHubInbox,
    parseHubInboxItem,
    parseUserInbox,
    parseUserInboxItem,
} from './payloads.js';
import { validateParams } from './validators.js';

// Init an inbox object.
//
// An inbox is a certain view on the list of rooms the user has access to.
//
// For hub users, the params object can include the following keys:
//
// - limit
// - archived
// - assignedTo
// - attributes
//
// For end users, only the limit is relevant.
//
// Example usage:
//
//  let inbox = Kabelwerk.openInbox({attributes: {country: 'DE'}});
//
//  inbox.once('ready', ({ items }) => {});
//  inbox.on('updated', ({ items }) => {});
//  inbox.loadMore().then(({ items }) => {});
//
const initInbox = function (socket, user, params = {}) {
    params = validateParams(params, {
        archived: { type: 'boolean', optional: true },
        assignedTo: { type: 'integer', nullable: true, optional: true },
        attributes: { type: 'map', optional: true },
        limit: { type: 'integer', optional: true },
    });

    const isHubSide = Boolean(user.hubId);

    let dispatcher = initDispatcher(['error', 'ready', 'updated']);

    // internal state
    let items = new Map(); // room id: inbox item
    let ready = false;

    // the base params (as a map) for the list_rooms pushes
    const loadRoomsParams = (function () {
        let pushParams = new Map();

        pushParams.set('limit', params.has('limit') ? params.get('limit') : 10);
        pushParams.set('offset', 0);

        if (!isHubSide) {
            return pushParams;
        }

        if (params.has('archived')) {
            pushParams.set('archived', params.get('archived'));
        }

        if (params.has('assignedTo')) {
            pushParams.set('hub_user', params.get('assignedTo'));
        }

        if (params.has('attributes')) {
            pushParams.set(
                'attributes',
                Object.fromEntries(params.get('attributes'))
            );
        }

        return pushParams;
    })();

    // helper functions
    const parseInbox = isHubSide ? parseHubInbox : parseUserInbox;
    const parseInboxItem = isHubSide ? parseHubInboxItem : parseUserInboxItem;

    const matchesParams = function (item) {
        if (!isHubSide) {
            return true;
        }

        if (params.has('archived')) {
            if (item.room.archived !== params.get('archived')) {
                return false;
            }
        }

        if (params.has('assignedTo')) {
            if (item.room.assignedTo !== params.get('assignedTo')) {
                return false;
            }
        }

        if (params.has('attributes')) {
            for (let [key, value] of params.get('attributes').entries()) {
                if (item.room.attributes[key] !== value) {
                    return false;
                }
            }
        }

        return true;
    };

    const listItems = function () {
        let list = Array.from(items.values());

        list.sort(function (itemA, itemB) {
            let a = itemA.message ? itemA.message.insertedAt.getTime() : null;
            let b = itemB.message ? itemB.message.insertedAt.getTime() : null;

            return b - a;
        });

        return list;
    };

    // the phoenix channel
    let channel = null;

    const setupChannel = function () {
        const topic = isHubSide
            ? `hub_inbox:${user.hubId}`
            : `user_inbox:${user.id}`;

        channel = socket.channel(topic);

        channel.on('inbox_updated', function (payload) {
            let item = parseInboxItem(payload, user);

            if (matchesParams(item)) {
                items.set(item.room.id, item);
            } else if (items.has(item.room.id)) {
                items.delete(item.room.id);
            } else {
                return; // no change in the items list
            }

            dispatcher.send('updated', {
                items: listItems(),
            });
        });

        channel
            .join()
            .receive('ok', function () {
                logger.info(`Joined the ${topic} channel.`);
                loadItemsOnJoin();
            })
            .receive('error', function (error) {
                logger.error(`Failed to join the ${topic} channel.`, error);
                dispatcher.send('error', PushRejected());
            })
            .receive('timeout', function () {
                dispatcher.send('error', Timeout());
            });
    };

    const loadItemsOnJoin = function () {
        let pushParams = new Map(loadRoomsParams);

        pushParams.set('offset', 0);

        if (items.size > pushParams.get('limit')) {
            pushParams.set('limit', items.size);
        }

        channel
            .push('list_rooms', Object.fromEntries(pushParams))
            .receive('ok', function (payload) {
                for (let item of parseInbox(payload, user).items) {
                    items.set(item.room.id, item);
                }

                if (!ready) {
                    ready = true;

                    dispatcher.send('ready', {
                        items: listItems(),
                    });
                } else {
                    dispatcher.send('updated', {
                        items: listItems(),
                    });
                }
            })
            .receive('error', function (error) {
                logger.error('Failed to retrieve the inbox items.', error);
                dispatcher.send('error', PushRejected());
            })
            .receive('timeout', function () {
                dispatcher.send('error', Timeout());
            });
    };

    const ensureHubSide = function () {
        if (!isHubSide) {
            throw UsageError('This method is only available for hub users.');
        }
    };

    return {
        connect: function () {
            if (channel) {
                throw UsageError(
                    'The connect() method was already called once.'
                );
            }

            setupChannel();
        },

        disconnect: function () {
            dispatcher.off();

            if (channel) channel.leave();
            channel = null;

            items = new Map();
            ready = false;
        },

        // Return the list of inbox items stored locally.
        //
        listItems: listItems,

        // Load more inbox items.
        //
        // Return a promise that either resolves into the list of inbox items
        // or rejects with an error.
        //
        loadMore: function () {
            return new Promise(function (resolve, reject) {
                let pushParams = new Map(loadRoomsParams);

                pushParams.set('offset', items.size);

                channel
                    .push('list_rooms', Object.fromEntries(pushParams))
                    .receive('ok', function (payload) {
                        for (let item of parseInbox(payload, user).items) {
                            items.set(item.room.id, item);
                        }

                        resolve({
                            items: listItems(),
                        });
                    })
                    .receive('error', function (error) {
                        logger.error('Failed to load more inbox items.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,

        // Search for inbox items by user key and/or name.
        //
        // Returns a promise that either resolves into a list of inbox items or
        // rejects with an error.
        //
        search: function (params) {
            ensureHubSide();

            params = validateParams(params, {
                query: { type: 'string' },
                limit: { type: 'integer', optional: true },
                offset: { type: 'integer', optional: true },
            });

            let pushParams = new Map(loadRoomsParams);

            pushParams.set('search_query', params.get('query'));

            pushParams.set(
                'limit',
                params.has('limit') ? params.get('limit') : 10
            );

            pushParams.set(
                'offset',
                params.has('offset') ? params.get('offset') : 0
            );

            return new Promise(function (resolve, reject) {
                channel
                    .push('list_rooms', Object.fromEntries(pushParams))
                    .receive('ok', function (payload) {
                        resolve({
                            items: parseInbox(payload, user).items,
                        });
                    })
                    .receive('error', function (error) {
                        logger.error('The search failed.', error);
                        reject(PushRejected());
                    })
                    .receive('timeout', function () {
                        reject(Timeout());
                    });
            });
        },
    };
};

export { initInbox };
