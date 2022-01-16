import { PayloadFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';
import { initNotifier } from '../src/notifier.js';

describe('connect', () => {
    const user = { id: 1, hubId: null };

    let notifier = null;

    beforeEach(() => {
        notifier = initNotifier(MockSocket, user);
    });

    test('channel is joined', () => {
        notifier.connect();

        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith(
            'notifier:1',
            expect.any(Function)
        );

        expect(MockChannel.join).toHaveBeenCalledTimes(1);
    });

    test('join error → error event', () => {
        expect.assertions(2);

        notifier.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        notifier.connect();
        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        notifier.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        notifier.connect();
        MockPush.__serverRespond('timeout', {});
    });

    test('join ok → ready event', () => {
        expect.assertions(3);

        const joinRes = PayloadFactory.notifierJoin(1);

        notifier.on('ready', ({ messages }) => {
            expect(messages.length).toBe(1);

            expect(messages[0].id).toBe(joinRes.messages[0].id);
            expect(messages[0].roomId).toBe(joinRes.messages[0].room_id);
        });

        notifier.connect();

        MockPush.__serverRespond('ok', joinRes, false);
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        const joinRes = PayloadFactory.notifierJoin(2);

        notifier.on('ready', ({ messages }) => {
            expect(messages.length).toBe(2);
        });

        notifier.connect();

        MockPush.__serverRespond('ok', joinRes, false);
        MockPush.__serverRespond('ok', joinRes, false);
    });
});

describe('updated event', () => {
    const user = { id: 1, hubId: null };
    const joinRes = PayloadFactory.notifierJoin(0);

    let notifier = null;

    beforeEach(() => {
        notifier = initNotifier(MockSocket, user);

        notifier.connect();
        MockPush.__serverRespond('ok', joinRes, false);
    });

    test('emitted at server sending message_posted', () => {
        expect.assertions(2);

        const push = PayloadFactory.notifierMessage();

        notifier.on('updated', (payload) => {
            expect(payload.message.id).toBe(push.message.id);
            expect(payload.message.roomId).toBe(push.message.room_id);
        });

        MockChannel.__serverPush('message_posted', push);
    });

    test('emitted at channel rejoin', () => {
        expect.assertions(2);

        const joinRes = PayloadFactory.notifierJoin(1);

        notifier.on('updated', (payload) => {
            expect(payload.message.id).toBe(joinRes.messages[0].id);
            expect(payload.message.roomId).toBe(joinRes.messages[0].room_id);
        });

        // channel rejoin
        MockPush.__serverRespond('ok', joinRes, false);
    });
});
