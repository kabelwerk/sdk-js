import { Channel, Push } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initInbox } = await import('../src/inbox.js');


test('list_rooms ok', (done) => {
    let inbox = initInbox(Channel);

    inbox.listRooms().then((rooms) => {
        expect(rooms).toEqual({rooms: []});
        done();
    });

    Push.__serverRespond('ok', {rooms: []});
});

test('list_rooms error', (done) => {
    let inbox = initInbox(Channel);

    inbox.listRooms().catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe(PUSH_REJECTED);
        done();
    });

    Push.__serverRespond('error');
});

test('list_rooms timeout', (done) => {
    let inbox = initInbox(Channel);

    inbox.listRooms().catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe(TIMEOUT);
        done();
    });

    Push.__serverRespond('timeout');
});
