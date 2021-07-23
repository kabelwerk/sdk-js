import {
    hubInboxChannelFactory,
    userInboxChannelFactory
} from './helpers/factories.js';
import { MockChannel, MockPush } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initInbox } = await import('../src/inbox.js');


describe('user inbox init', () => {
    beforeEach(() => {
        MockChannel.topic = 'user_inbox:0';
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('default params', () => {
        initInbox(MockChannel);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 10,
            offset: 0,
        });
    });

    test('custom limit', () => {
        initInbox(MockChannel, { limit: 50 });

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
        });
    });

    test('empty inbox', () => {
        let inbox = initInbox(MockChannel);

        let response = userInboxChannelFactory.createInbox(0);
        MockPush.__serverRespond('ok', response);

        let list = inbox.listRooms();
        expect(list.length).toBe(0);
    });

    test('inbox of one room', () => {
        let inbox = initInbox(MockChannel);

        let response = userInboxChannelFactory.createInbox(1);
        MockPush.__serverRespond('ok', response);

        let list = inbox.listRooms();
        expect(list.length).toBe(1);

        let left = list[0], right = response.rooms[0];
        expect(left.id).toBe(right.id);
        expect(left.lastMessage.id).toBe(right.last_message.id);
        expect(left.lastMessage.text).toBe(right.last_message.text);
    });
});

describe('hub inbox init', () => {
    beforeEach(() => {
        MockChannel.topic = 'hub_inbox:0';
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('default params', () => {
        initInbox(MockChannel);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 10,
            offset: 0,
        });
    });

    test('custom params', () => {
        initInbox(MockChannel, {
            limit: 50,
            archived: true,
            assignedTo: 1,
            attributes: {country: 'DE'},
        });

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
            archived: true,
            hub_user: 1,
            attributes: {country: 'DE'},
        });
    });

    test('empty inbox', () => {
        let inbox = initInbox(MockChannel);

        let response = hubInboxChannelFactory.createInbox(0);
        MockPush.__serverRespond('ok', response);

        let list = inbox.listRooms();
        expect(list.length).toBe(0);
    });

    test('inbox of one room', () => {
        let inbox = initInbox(MockChannel);

        let response = hubInboxChannelFactory.createInbox(1);
        MockPush.__serverRespond('ok', response);

        let list = inbox.listRooms();
        expect(list.length).toBe(1);

        let left = list[0], right = response.rooms[0];
        expect(left.id).toBe(right.id);
        expect(left.lastMessage.id).toBe(right.last_message.id);
        expect(left.lastMessage.text).toBe(right.last_message.text);
        expect(left.user.id).toBe(right.user.id);
    });
});

describe('user inbox rooms list re-ordering', () => {
    let initialResponse = userInboxChannelFactory.createInbox(2);
    let [roomA, roomB] = initialResponse.rooms;
    let inbox = null;

    beforeEach(() => {
        MockChannel.topic = 'user_inbox:0';
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', initialResponse);
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('new message moves room to top', () => {
        let update = userInboxChannelFactory.createInboxRoom({ id: roomB.id });
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listRooms();
        expect(list.length).toBe(2);

        expect(list[0].id).toBe(roomB.id);
        expect(list[0].lastMessage.id).toBe(update.last_message.id);
        expect(list[0].lastMessage.text).toBe(update.last_message.text);

        expect(list[1].id).toBe(roomA.id);
        expect(list[1].lastMessage.id).toBe(roomA.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomA.last_message.text);
    });

    test('new message pushes a new room', () => {
        let update = userInboxChannelFactory.createInboxRoom();
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listRooms();
        expect(list.length).toBe(3);

        expect(list[0].id).toBe(update.id);
        expect(list[0].lastMessage.id).toBe(update.last_message.id);
        expect(list[0].lastMessage.text).toBe(update.last_message.text);

        expect(list[1].id).toBe(roomB.id);
        expect(list[1].lastMessage.id).toBe(roomB.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomB.last_message.text);

        expect(list[2].id).toBe(roomA.id);
        expect(list[2].lastMessage.id).toBe(roomA.last_message.id);
        expect(list[2].lastMessage.text).toBe(roomA.last_message.text);
    });

    test('new message without re-ordering', () => {
        let update = userInboxChannelFactory.createInboxRoom({ id: roomA.id });
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listRooms();
        expect(list.length).toBe(2);

        expect(list[0].id).toBe(roomA.id);
        expect(list[0].lastMessage.id).toBe(update.last_message.id);
        expect(list[0].lastMessage.text).toBe(update.last_message.text);

        expect(list[1].id).toBe(roomB.id);
        expect(list[1].lastMessage.id).toBe(roomB.last_message.id);
        expect(list[1].lastMessage.text).toBe(roomB.last_message.text);
    });
});

describe('user inbox updated event', () => {
    const initialResponse = userInboxChannelFactory.createInbox(0);
    let inbox = null;

    beforeEach(() => {
        MockChannel.topic = 'user_inbox:0';
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', initialResponse);
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('works', () => {
        expect.assertions(2);

        let update = userInboxChannelFactory.createInboxRoom();

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
            expect(rooms[0].id).toBe(update.id);
        });

        MockChannel.__serverPush('inbox_updated', update);
    });
});

describe('hub inbox updated event', () => {
    let emptyResponse = hubInboxChannelFactory.createInbox(0);
    let inbox = null;

    beforeEach(() => {
        MockChannel.topic = 'hub_inbox:0';
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('default params', () => {
        expect.assertions(2);

        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', emptyResponse);

        let update = hubInboxChannelFactory.createInboxRoom();

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
            expect(rooms[0].id).toBe(update.id);
        });

        MockChannel.__serverPush('inbox_updated', update);
    });

    test('filter archived rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockChannel, { archived: true });
        MockPush.__serverRespond('ok', emptyResponse);

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ archived: false })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ archived: true })
        );
    });

    test('filter unarchived rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockChannel, { archived: false });
        MockPush.__serverRespond('ok', emptyResponse);

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ archived: false })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ archived: true })
        );
    });

    test('filter rooms by attribute', () => {
        expect.assertions(1);

        inbox = initInbox(MockChannel, { attributes: {country: 'DE'} });
        MockPush.__serverRespond('ok', emptyResponse);

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({
                attributes: {country: 'JP', foo: 'bar'}
            })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({
                attributes: {country: 'DE', foo: 'bar'}
            })
        );
    });

    test('filter assigned rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockChannel, { assignedTo: 2 });
        MockPush.__serverRespond('ok', emptyResponse);

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ hub_user_id: null })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ hub_user_id: 2 })
        );
    });

    test('filter unassigned rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockChannel, { assignedTo: null });
        MockPush.__serverRespond('ok', emptyResponse);

        inbox.on('updated', (rooms) => {
            expect(rooms.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ hub_user_id: null })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            hubInboxChannelFactory.createInboxRoom({ hub_user_id: 2 })
        );
    });
});

describe('user inbox loading more rooms', () => {
    let initialResponse = userInboxChannelFactory.createInbox(1);
    let inbox = null;

    beforeEach(() => {
        MockChannel.topic = 'user_inbox:0';
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', initialResponse);
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('default params', () => {
        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(2);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 10,
            offset: 1,
        });
    });

    test('custom limit', () => {
        let inbox = initInbox(MockChannel, { limit: 20 });
        MockPush.__serverRespond('ok', initialResponse);

        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(3);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 20,
            offset: 1,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = userInboxChannelFactory.createInbox(1);

        inbox.loadMore().then((rooms) => {
            expect(rooms.length).toBe(2);
            expect(rooms[0].id).toBe(response.rooms[0].id);
            expect(rooms[1].id).toBe(initialResponse.rooms[0].id);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });

    test('room without last message', () => {
        expect.assertions(3);

        let response = userInboxChannelFactory.createInbox(1, {last_message: null});

        inbox.loadMore().then((rooms) => {
            expect(rooms.length).toBe(2);
            expect(rooms[0].id).toBe(initialResponse.rooms[0].id);
            expect(rooms[1].id).toBe(response.rooms[0].id);
        });

        MockPush.__serverRespond('ok', response);
    });
});

describe('hub inbox loading more rooms', () => {
    let initialResponse = hubInboxChannelFactory.createInbox(1);
    let inbox = null;

    beforeEach(() => {
        MockChannel.topic = 'hub_inbox:0';
        inbox = initInbox(MockChannel);
        MockPush.__serverRespond('ok', initialResponse);
    });

    afterEach(() => {
        delete MockChannel.topic;
    });

    test('default params', () => {
        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(2);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 10,
            offset: 1,
        });
    });

    test('custom params', () => {
        let inbox = initInbox(MockChannel, {
            limit: 20,
            archived: true,
            assignedTo: 2,
            attributes: {city: 'Berlin'},
        });
        MockPush.__serverRespond('ok', initialResponse);

        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(3);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 20,
            offset: 1,
            archived: true,
            hub_user: 2,
            attributes: {city: 'Berlin'},
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = hubInboxChannelFactory.createInbox(1);

        inbox.loadMore().then((rooms) => {
            expect(rooms.length).toBe(2);
            expect(rooms[0].id).toBe(response.rooms[0].id);
            expect(rooms[1].id).toBe(initialResponse.rooms[0].id);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        inbox.loadMore().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });

    test('room without last message', () => {
        expect.assertions(3);

        let response = hubInboxChannelFactory.createInbox(1, {last_message: null});

        inbox.loadMore().then((rooms) => {
            expect(rooms.length).toBe(2);
            expect(rooms[0].id).toBe(initialResponse.rooms[0].id);
            expect(rooms[1].id).toBe(response.rooms[0].id);
        });

        MockPush.__serverRespond('ok', response);
    });
});
