import { PayloadFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initInbox } = await import('../src/inbox.js');

describe('user inbox connect', () => {
    const topic = 'user_inbox:0';

    test('channel is joined', () => {
        let inbox = initInbox(MockSocket, topic);

        inbox.connect();
        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith(topic);

        expect(MockChannel.join).toHaveBeenCalledTimes(1);
    });

    test('join error → error event', () => {
        expect.assertions(2);

        let inbox = initInbox(MockSocket, topic);

        inbox.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        inbox.connect();
        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        let inbox = initInbox(MockSocket, topic);

        inbox.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        inbox.connect();
        MockPush.__serverRespond('timeout', {});
    });

    test('push params, default', () => {
        let inbox = initInbox(MockSocket, topic);

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 10,
            offset: 0,
        });
    });

    test('push params, custom limit', () => {
        let inbox = initInbox(MockSocket, topic, { limit: 50 });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
        });
    });

    test('push error → error event', () => {
        expect.assertions(2);

        let inbox = initInbox(MockSocket, topic, { limit: 50 });

        inbox.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('error', {}); // push response
    });

    test('push timeout → error event', () => {
        expect.assertions(2);

        let inbox = initInbox(MockSocket, topic, { limit: 50 });

        inbox.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('timeout', {}); // push response
    });

    test('push ok → ready event, empty inbox', () => {
        expect.assertions(2);

        let inbox = initInbox(MockSocket, topic);

        inbox.on('ready', (res) => {
            expect(res.items.length).toBe(0);
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        let response = PayloadFactory.inbox(0);
        MockPush.__serverRespond('ok', response); // push response

        let list = inbox.listItems();
        expect(list.length).toBe(0);
    });

    test('push ok → ready event, inbox of one item', () => {
        expect.assertions(6);

        let inbox = initInbox(MockSocket, topic);

        inbox.on('ready', (res) => {
            expect(res.items.length).toBe(1);
            expect(res.items).toEqual(inbox.listItems());
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        let response = PayloadFactory.inbox(1);
        MockPush.__serverRespond('ok', response); // push response

        let list = inbox.listItems();
        expect(list.length).toBe(1);

        let left = list[0],
            right = response.items[0];
        expect(left.id).toBe(right.id);
        expect(left.message.id).toBe(right.message.id);
        expect(left.message.text).toBe(right.message.text);
    });

    test('rejoin push params, default', () => {
        let inbox = initInbox(MockSocket, topic);
        inbox.connect();

        let joinCallback = MockPush.receive.mock.calls.find(
            (call) => call[0] == 'ok'
        )[1];

        MockPush.__serverRespond('ok', {}, false); // join response
        joinCallback({}); // rejoin response

        expect(MockChannel.push).toHaveBeenCalledTimes(2); // 2 list_rooms pushes
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 10,
            offset: 0,
        });
    });

    test('rejoin push params, custom limit', () => {
        let inbox = initInbox(MockSocket, topic, { limit: 50 });
        inbox.connect();

        let joinCallback = MockPush.receive.mock.calls.find(
            (call) => call[0] == 'ok'
        )[1];

        MockPush.__serverRespond('ok', {}, false); // join response
        joinCallback({}); // rejoin response

        expect(MockChannel.push).toHaveBeenCalledTimes(2); // 2 list_rooms pushes
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
        });
    });

    test('updates betweeen rejoins are emitted', () => {
        expect.assertions(1);

        const firstInbox = PayloadFactory.inbox(0);
        const secondInbox = PayloadFactory.inbox(1);

        let inbox = initInbox(MockSocket, topic);
        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });
        inbox.connect();

        MockPush.__serverRespond('ok', {}, false); // join response

        const okCalls = MockPush.receive.mock.calls.filter(
            (call) => call[0] == 'ok'
        );
        const joinCallback = okCalls[0][1];
        const pushCallback = okCalls[1][1];

        pushCallback(firstInbox); // first list_rooms response
        joinCallback({}); // rejoin response
        pushCallback(secondInbox); // second list_rooms response
    });
});

describe('hub inbox connect', () => {
    const topic = 'hub_inbox:0';

    test('push params, default', () => {
        let inbox = initInbox(MockSocket, topic);

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 10,
            offset: 0,
        });
    });

    test('push params, custom params', () => {
        let inbox = initInbox(MockSocket, topic, {
            limit: 50,
            archived: true,
            assignedTo: 1,
            attributes: { country: 'DE' },
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
            archived: true,
            hub_user: 1,
            attributes: { country: 'DE' },
        });
    });

    test('rejoin push params, custom params', () => {
        let inbox = initInbox(MockSocket, topic, {
            limit: 50,
            archived: true,
            assignedTo: 1,
            attributes: { country: 'DE' },
        });
        inbox.connect();

        let joinCallback = MockPush.receive.mock.calls.find(
            (call) => call[0] == 'ok'
        )[1];

        MockPush.__serverRespond('ok', {}, false); // join response
        joinCallback({}); // rejoin response

        expect(MockChannel.push).toHaveBeenCalledTimes(2); // 2 list_rooms pushes
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 50,
            offset: 0,
            archived: true,
            hub_user: 1,
            attributes: { country: 'DE' },
        });
    });

    test('push ok → ready event, inbox of one item', () => {
        expect.assertions(7);

        let inbox = initInbox(MockSocket, topic);

        inbox.on('ready', (res) => {
            expect(res.items.length).toBe(1);
            expect(res.items).toEqual(inbox.listItems());
        });

        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response

        let response = PayloadFactory.hubInbox(1);
        MockPush.__serverRespond('ok', response); // push response

        let list = inbox.listItems();
        expect(list.length).toBe(1);

        let left = list[0],
            right = response.items[0];
        expect(left.room.id).toBe(right.room.id);
        expect(left.room.user.id).toBe(right.room.user.id);
        expect(left.message.id).toBe(right.message.id);
        expect(left.message.text).toBe(right.message.text);
    });
});

describe('user inbox items list re-ordering', () => {
    const listResponse = PayloadFactory.inbox(2);
    const [itemA, itemB] = listResponse.items;

    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, 'user_inbox:0');
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response
    });

    test('new message moves room to top', () => {
        let update = PayloadFactory.inboxItem({
            id: itemB.room.id,
        });
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listItems();
        expect(list.length).toBe(2);

        expect(list[0].room.id).toBe(itemB.room.id);
        expect(list[0].message.id).toBe(update.message.id);
        expect(list[0].message.text).toBe(update.message.text);

        expect(list[1].room.id).toBe(itemA.room.id);
        expect(list[1].message.id).toBe(itemA.message.id);
        expect(list[1].message.text).toBe(itemA.message.text);
    });

    test('new message pushes a new room', () => {
        let update = PayloadFactory.inboxItem();
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listItems();
        expect(list.length).toBe(3);

        expect(list[0].room.id).toBe(update.room.id);
        expect(list[0].message.id).toBe(update.message.id);
        expect(list[0].message.text).toBe(update.message.text);

        expect(list[1].room.id).toBe(itemB.room.id);
        expect(list[1].message.id).toBe(itemB.message.id);
        expect(list[1].message.text).toBe(itemB.message.text);

        expect(list[2].room.id).toBe(itemA.room.id);
        expect(list[2].message.id).toBe(itemA.message.id);
        expect(list[2].message.text).toBe(itemA.message.text);
    });

    test('new message without re-ordering', () => {
        let update = PayloadFactory.inboxItem({
            id: itemA.room.id,
        });
        MockChannel.__serverPush('inbox_updated', update);

        let list = inbox.listItems();
        expect(list.length).toBe(2);

        expect(list[0].room.id).toBe(itemA.room.id);
        expect(list[0].message.id).toBe(update.message.id);
        expect(list[0].message.text).toBe(update.message.text);

        expect(list[1].room.id).toBe(itemB.room.id);
        expect(list[1].message.id).toBe(itemB.message.id);
        expect(list[1].message.text).toBe(itemB.message.text);
    });
});

describe('user inbox updated event', () => {
    const listResponse = PayloadFactory.inbox(0);

    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, 'user_inbox:0');
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response
    });

    test('works', () => {
        expect.assertions(2);

        let update = PayloadFactory.inboxItem();

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
            expect(items[0].id).toBe(update.id);
        });

        MockChannel.__serverPush('inbox_updated', update);
    });
});

describe('hub inbox updated event', () => {
    const topic = 'hub_inbox:0';
    const emptyResponse = PayloadFactory.hubInbox(0);

    let inbox = null;

    test('default params', () => {
        expect.assertions(2);

        inbox = initInbox(MockSocket, topic);
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        let update = PayloadFactory.hubInboxItem();

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
            expect(items[0].room.id).toBe(update.room.id);
        });

        MockChannel.__serverPush('inbox_updated', update);
    });

    test('filter archived rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockSocket, topic, { archived: true });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ archived: false })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ archived: true })
        );
    });

    test('filter unarchived rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockSocket, topic, { archived: false });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ archived: false })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ archived: true })
        );
    });

    test('filter rooms by attribute', () => {
        expect.assertions(1);

        inbox = initInbox(MockSocket, topic, { attributes: { country: 'DE' } });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({
                attributes: { country: 'JP', foo: 'bar' },
            })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({
                attributes: { country: 'DE', foo: 'bar' },
            })
        );
    });

    test('filter assigned rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockSocket, topic, { assignedTo: 2 });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ hub_user_id: null })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ hub_user_id: 2 })
        );
    });

    test('filter unassigned rooms', () => {
        expect.assertions(1);

        inbox = initInbox(MockSocket, topic, { assignedTo: null });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', emptyResponse); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ hub_user_id: null })
        );
        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({ hub_user_id: 2 })
        );
    });

    test('non-archive inbox, room is archived', () => {
        expect.assertions(3);

        const response = PayloadFactory.hubInbox(1);
        const roomId = response.items[0].room.id;

        inbox = initInbox(MockSocket, topic, { archived: false });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', response); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(0);
            expect(inbox.listItems().length).toBe(0);
        });

        expect(inbox.listItems().length).toBe(1);

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({
                id: roomId,
                archived: true,
            })
        );
    });

    test('personal inbox, room is unassigned', () => {
        expect.assertions(3);

        const response = PayloadFactory.hubInbox(1);
        const roomId = response.items[0].room.id;

        inbox = initInbox(MockSocket, topic, { assignedTo: 1 });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', response); // first rooms response

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(0);
            expect(inbox.listItems().length).toBe(0);
        });

        expect(inbox.listItems().length).toBe(1);

        MockChannel.__serverPush(
            'inbox_updated',
            PayloadFactory.hubInboxItem({
                id: roomId,
            })
        );
    });
});

describe('user inbox loading more rooms', () => {
    const topic = 'user_inbox:0';
    const listResponse = PayloadFactory.inbox(1);

    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, topic);
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response
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
        let inbox = initInbox(MockSocket, topic, { limit: 20 });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response

        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(3);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 20,
            offset: 1,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = PayloadFactory.inbox(1);

        inbox.loadMore().then(({ items }) => {
            expect(items.length).toBe(2);
            expect(items[0].room.id).toBe(response.items[0].room.id);
            expect(items[1].room.id).toBe(listResponse.items[0].room.id);
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

        let response = PayloadFactory.inbox(1, {
            message: null,
        });

        inbox.loadMore().then(({ items }) => {
            expect(items.length).toBe(2);
            expect(items[0].room.id).toBe(listResponse.items[0].room.id);
            expect(items[1].room.id).toBe(response.items[0].room.id);
        });

        MockPush.__serverRespond('ok', response);
    });
});

describe('hub inbox loading more rooms', () => {
    const topic = 'hub_inbox:0';
    const listResponse = PayloadFactory.hubInbox(1);

    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, topic);
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response
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
        let inbox = initInbox(MockSocket, topic, {
            limit: 20,
            archived: true,
            assignedTo: 2,
            attributes: { city: 'Berlin' },
        });
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response

        inbox.loadMore();

        expect(MockChannel.push).toHaveBeenCalledTimes(3);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            limit: 20,
            offset: 1,
            archived: true,
            hub_user: 2,
            attributes: { city: 'Berlin' },
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = PayloadFactory.hubInbox(1);

        inbox.loadMore().then(({ items }) => {
            expect(items.length).toBe(2);
            expect(items[0].room.id).toBe(response.items[0].room.id);
            expect(items[1].room.id).toBe(listResponse.items[0].room.id);
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

        let response = PayloadFactory.hubInbox(1, {
            message: null,
        });

        inbox.loadMore().then(({ items }) => {
            expect(items.length).toBe(2);
            expect(items[0].room.id).toBe(listResponse.items[0].room.id);
            expect(items[1].room.id).toBe(response.items[0].room.id);
        });

        MockPush.__serverRespond('ok', response);
    });
});

describe('hub inbox searching rooms', () => {
    const topic = 'hub_inbox:0';
    const listResponse = PayloadFactory.hubInbox(0);

    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, topic);
        inbox.connect();
        MockPush.__serverRespond('ok', {}, 'clear-initial'); // join response
        MockPush.__serverRespond('ok', listResponse); // push response
    });

    test('default params', () => {
        inbox.search({ query: 'x' });

        expect(MockChannel.push).toHaveBeenCalledTimes(2);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            search_query: 'x',
            limit: 10,
            offset: 0,
        });
    });

    test('custom limit and offset', () => {
        inbox.search({ query: 'x', limit: 2, offset: 4 });

        expect(MockChannel.push).toHaveBeenCalledTimes(2);
        expect(MockChannel.push).toHaveBeenLastCalledWith('list_rooms', {
            search_query: 'x',
            limit: 2,
            offset: 4,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(2);

        let response = PayloadFactory.hubInbox(1);

        inbox.search({ query: 'x' }).then(({ items }) => {
            expect(items.length).toBe(1);
            expect(items[0].room.id).toBe(response.items[0].room.id);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        inbox.search({ query: 'x' }).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        inbox.search({ query: 'x' }).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('disconnect', () => {
    let inbox = null;

    beforeEach(() => {
        inbox = initInbox(MockSocket, 'user_inbox:0');
        inbox.connect();
    });

    test('leaves the channel', () => {
        inbox.disconnect();

        expect(MockChannel.leave).toHaveBeenCalledTimes(1);
    });

    test('removes the event listeners', () => {
        expect.assertions(0);

        let update = PayloadFactory.inboxItem();

        inbox.on('updated', ({ items }) => {
            expect(items.length).toBe(1);
        });

        inbox.disconnect();

        MockChannel.__serverPush('inbox_updated', update);
    });
});
