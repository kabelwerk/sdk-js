import { messageFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initRoom } = await import('../src/room.js');


describe('channel rejoin', () => {
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        room.on('ready', (res) => {
            expect(res).toEqual([]);
        });

        MockPush.__serverRespond('ok', {messages: []}, false);
        MockPush.__serverRespond('ok', {messages: []}, false);
    });

    test('error event is emitted every time', () => {
        expect.assertions(2);

        room.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
        });

        MockPush.__serverRespond('error', {}, false);
        MockPush.__serverRespond('error', {}, false);
    });

    test('messages posted between rejoins are emitted', () => {
        let message = messageFactory.create({room_id: 0});

        expect.assertions(1);

        room.on('message_posted', (res) => {
            expect(res.id).toBe(message.id);
        });

        // first join
        MockPush.__serverRespond('ok', {messages: []}, false);

        // rejoin
        MockPush.__serverRespond('ok', {messages: [message]}, false);
    });
});

describe('message posted', () => {
    let room = null;
    let message = messageFactory.create({ room_id: 0 });

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', {messages: []});
    });

    test('new message', (done) => {
        expect.assertions(2);

        room.on('message_posted', (res) => {
            expect(res.id).toBe(message.id);
            expect(res.text).toBe(message.text);

            done();
        });

        MockChannel.__serverPush('message_posted', message);
    });
});

describe('load earlier', () => {
    let [messageA, messageB] = messageFactory.createBatch(2, {room_id: 0})
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', {messages: [messageB]});
    });

    test('push params', () => {
        room.loadEarlier();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_messages', {
            before: messageB.id,
        });
    });

    test('server responds with ok', (done) => {
        room.loadEarlier().then((res) => {
            expect(res.length).toBe(1);
            expect(res[0].id).toBe(messageA.id);
            expect(res[0].text).toBe(messageA.text);

            done();
        });

        MockPush.__serverRespond('ok', {messages: [messageA]});
    });

    test('server responds with error', (done) => {
        room.loadEarlier().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            done();
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', (done) => {
        room.loadEarlier().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            done();
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('post message', () => {
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', {messages: []});
    });

    test('push params', () => {
        room.postMessage({text: 'hello server!'});

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('post_message', {
            text: 'hello server!',
        });
    });

    test('server responds with ok', (done) => {
        let message = messageFactory.create({ room_id: 0 });

        room.postMessage({}).then((res) => {
            expect(res.id).toBe(message.id);
            expect(res.text).toBe(message.text);

            done();
        });

        MockPush.__serverRespond('ok', message);
    });

    test('server responds with error', (done) => {
        room.postMessage({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            done();
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', (done) => {
        room.postMessage({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            done();
        });

        MockPush.__serverRespond('timeout');
    });
});
