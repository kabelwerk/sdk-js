import { initDispatcher } from './dispatcher.js';
import { PushRejected, Timeout, UsageError } from './errors.js';
import logger from './logger.js';
import { parseNotifierJoin, parseNotifierMessage } from './payloads.js';

// Init a notifier object.
//
// Example usage:
//
//  let notifier = Kabelwerk.openNotifier();
//
//  notifier.on('ready', ({ messages }) => {});
//  notifier.on('updated', ({ message }) => {});
//
//  notifier.connect();
//
const initNotifier = function (socket, user) {
    let dispatcher = initDispatcher(['error', 'ready', 'updated']);

    // internal state
    let lastMessageId = null;
    let ready = false;

    const updateLastMessageId = function (messages) {
        let max = null;

        for (const message of messages) {
            if (message.id > max) max = message.id;
        }

        if (max) lastMessageId = max;
    };

    // the phoenix channel
    let channel = null;

    const setupChannel = function () {
        channel = socket.channel(`notifier:${user.id}`, function () {
            let params = {};

            if (lastMessageId) {
                params.after = lastMessageId;
            }

            return params;
        });

        channel.on('message_posted', function (payload) {
            const message = parseNotifierMessage(payload).message;

            updateLastMessageId([message]);

            dispatcher.send('updated', { message });
        });

        channel
            .join()
            .receive('ok', function (payload) {
                logger.info(`Joined the ${channel.topic} channel.`);

                const messages = parseNotifierJoin(payload).messages;

                updateLastMessageId(messages);

                if (ready) {
                    for (const message of messages) {
                        dispatcher.send('updated', { message });
                    }
                } else {
                    ready = true;

                    dispatcher.send('ready', { messages });
                }
            })
            .receive('error', function (error) {
                logger.error(
                    `Failed to join the ${channel.topic} channel.`,
                    error,
                );

                dispatcher.send('error', PushRejected());
            })
            .receive('timeout', function () {
                dispatcher.send('error', Timeout());
            });
    };

    return {
        connect: function () {
            if (channel) {
                throw UsageError(
                    'The connect() method was already called once.',
                );
            }

            setupChannel();
        },

        disconnect: function () {
            dispatcher.off();

            if (channel) channel.leave();
            channel = null;

            lastMessageId = null;
            ready = false;
        },

        on: dispatcher.on,
        off: dispatcher.off,
        once: dispatcher.once,
    };
};

export { initNotifier };
