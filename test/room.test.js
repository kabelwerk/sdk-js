import { Channel, Push, Socket } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initRoom } = await import('../src/room.js');


test('room inits a phoenix channel', () => {
    let room = initRoom(Socket, 101);
    expect(room).toBeTruthy();

    expect(Socket.channel).toHaveBeenCalledTimes(1);
    expect(Socket.channel).toHaveBeenCalledWith('room:101');

    expect(Channel.join).toHaveBeenCalledTimes(1);
});

test('on message_created', (done) => {
    expect.assertions(1);

    let room = initRoom(Socket, 101);

    room.on('message_created', (message) => {
        expect(message).toBe('hi!');
        done();
    });

    Channel.__serverPush('message_created', 'hi!');
});

test('create_message ok', (done) => {
    let room = initRoom(Socket, 101);

    room.createMessage('hello!').then((message) => {
        expect(message).toEqual({text: 'hello!'});
        done();
    });

    Push.__serverRespond('ok', {text: 'hello!'});
});

test('create_message error', (done) => {
    let room = initRoom(Socket, 101);

    room.createMessage('hello server!').catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe(PUSH_REJECTED);
        done();
    });

    Push.__serverRespond('error');
});

test('create_message timeout', (done) => {
    let room = initRoom(Socket, 101);

    room.createMessage('hello server!').catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe(TIMEOUT);
        done();
    });

    Push.__serverRespond('timeout');
});
