import { inboxRoomFactory, messageFactory } from './helpers/factories.js';
import { MockChannel, MockPush } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initInbox } = await import('../src/inbox.js');


describe('init', () => {
    test('default params', () => {
        initInbox(MockChannel);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 100,
            offset: 0,
            archived: false,
        });
    });

    test('custom params', () => {
        initInbox(MockChannel, {
            limit: 50,
            attributes: {country: 'DE'},
            hubUser: 1,
            archived: true,
        });

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
            attributes: {country: 'DE'},
            hub_user: 1,
            archived: true,
        });
    });

    test('empty inbox', () => {
        let inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', {rooms: []});

        let list = inbox.listRooms();
        expect(list.length).toBe(0);
    });

    test('inbox of one room', () => {
        let room = inboxRoomFactory.create();

        let inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', {rooms: [room]});

        let list = inbox.listRooms();
        expect(list.length).toBe(1);

        expect(list[0].id).toBe(room.id);
        expect(list[0].lastMessage.id).toBe(room.last_message.id);
        expect(list[0].lastMessage.text).toBe(room.last_message.text);
        expect(list[0].user.id).toBe(room.user.id);
    });
});

describe('inbox updated', () => {
    let [roomA, roomB] = inboxRoomFactory.createBatch(2);
    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', {rooms: [roomA, roomB]});
    });

    test('new message moves room to top', () => {
        let newMessage = messageFactory.create({room_id: roomB.id});
        MockChannel.__serverPush('inbox_updated', {
            id: roomB.id,
            hub_id: null,
            last_message: newMessage,
            user: roomB.user,
        });

        let list = inbox.listRooms();
        expect(list.length).toBe(2);

        expect(list[0].id).toBe(roomB.id);
        expect(list[0].lastMessage.id).toBe(newMessage.id);
        expect(list[0].lastMessage.text).toBe(newMessage.text);
        expect(list[0].user.id).toBe(roomB.user.id);

        expect(list[1].id).toBe(roomA.id);
        expect(list[1].lastMessage.id).toBe(roomA.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomA.last_message.text);
        expect(list[1].user.id).toBe(roomA.user.id);
    });

    test('new message pushes a new room', () => {
        let roomC = inboxRoomFactory.create();
        MockChannel.__serverPush('inbox_updated', roomC);

        let list = inbox.listRooms();
        expect(list.length).toBe(3);

        expect(list[0].id).toBe(roomC.id);
        expect(list[0].lastMessage.id).toBe(roomC.last_message.id);
        expect(list[0].lastMessage.text).toBe(roomC.last_message.text);
        expect(list[0].user.id).toBe(roomC.user.id);

        expect(list[1].id).toBe(roomB.id);
        expect(list[1].lastMessage.id).toBe(roomB.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomB.last_message.text);
        expect(list[1].user.id).toBe(roomB.user.id);

        expect(list[2].id).toBe(roomA.id);
        expect(list[2].lastMessage.id).toBe(roomA.last_message.id);
        expect(list[2].lastMessage.text).toBe(roomA.last_message.text);
        expect(list[2].user.id).toBe(roomA.user.id);
    });

    test('new message without re-ordering', () => {
        let newMessage = messageFactory.create({room_id: roomA.id});
        MockChannel.__serverPush('inbox_updated', {
            id: roomA.id,
            hub_id: null,
            last_message: newMessage,
            user: roomA.user,
        });

        let list = inbox.listRooms();
        expect(list.length).toBe(2);

        expect(list[0].id).toBe(roomA.id);
        expect(list[0].lastMessage.id).toBe(newMessage.id);
        expect(list[0].lastMessage.text).toBe(newMessage.text);
        expect(list[0].user.id).toBe(roomA.user.id);

        expect(list[1].id).toBe(roomB.id);
        expect(list[1].lastMessage.id).toBe(roomB.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomB.last_message.text);
        expect(list[1].user.id).toBe(roomB.user.id);
    });
});

describe('load more', () => {
    let [roomB, roomA] = inboxRoomFactory.createBatch(2);
    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', {rooms: [roomA]});
    });

    test('default params', () => {
        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(2);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 100,
            offset: 1,
            archived: false,
        });
    });

    test('custom params', () => {
        let inbox = initInbox(MockChannel, {
            limit: 20,
            attributes: {city: 'Berlin'},
            hubUser: 2,
            archived: true,
        });
        MockPush.__serverRespond('ok', {rooms: [roomA]});

        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(3);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 20,
            offset: 1,
            attributes: {city: 'Berlin'},
            hub_user: 2,
            archived: true,
        });
    });

    test('server responds with ok', (done) => {
        inbox.loadMore().then((rooms) => {
            expect(rooms.length).toBe(2);
            expect(rooms[0].id).toBe(roomA.id);
            expect(rooms[1].id).toBe(roomB.id);

            done();
        });

        MockPush.__serverRespond('ok', {rooms: [roomB]});
    });

    test('server responds with error', (done) => {
        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            done();
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', (done) => {
        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            done();
        });

        MockPush.__serverRespond('timeout');
    });
});
