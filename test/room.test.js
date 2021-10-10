import { roomChannelFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initRoom } = await import('../src/room.js');

describe('connect', () => {
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
    });

    test('channel is joined', () => {
        room.connect();
        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith(
            'room:0',
            expect.any(Function)
        );
    });

    test('join error → error event', () => {
        expect.assertions(2);

        room.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        room.connect();
        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        room.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        room.connect();
        MockPush.__serverRespond('timeout', {});
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        room.on('ready', ({ messages }) => {
            expect(messages).toEqual([]);
        });

        room.connect();

        MockPush.__serverRespond('ok', { messages: [] }, false);
        MockPush.__serverRespond('ok', { messages: [] }, false);
    });

    test('error event is emitted every time', () => {
        expect.assertions(2);

        room.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
        });

        room.connect();

        MockPush.__serverRespond('error', {}, false);
        MockPush.__serverRespond('error', {}, false);
    });

    test('messages posted between rejoins are emitted', () => {
        let message = roomChannelFactory.createMessage({ room_id: 0 });

        expect.assertions(1);

        room.on('message_posted', (res) => {
            expect(res.id).toBe(message.id);
        });

        room.connect();

        // first join
        MockPush.__serverRespond('ok', { messages: [] }, false);

        // rejoin
        MockPush.__serverRespond('ok', { messages: [message] }, false);
    });
});

describe('message posted event', () => {
    let initialResponse = roomChannelFactory.createMessageList(1);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('new message', () => {
        expect.assertions(2);

        let message = roomChannelFactory.createMessage();

        room.on('message_posted', (res) => {
            expect(res.id).toBe(message.id);
            expect(res.text).toBe(message.text);
        });

        MockChannel.__serverPush('message_posted', message);
    });
});

describe('load earlier messages', () => {
    let initialResponse = roomChannelFactory.createMessageList(1);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.loadEarlier();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('list_messages', {
            before: initialResponse.messages[0].id,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = roomChannelFactory.createMessageList(1);

        room.loadEarlier().then(({ messages }) => {
            expect(messages.length).toBe(1);
            expect(messages[0].id).toBe(response.messages[0].id);
            expect(messages[0].text).toBe(response.messages[0].text);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.loadEarlier().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.loadEarlier().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('post message in room', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.postMessage({ text: 'hello server!' });

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('post_message', {
            text: 'hello server!',
        });
    });

    test('server responds with ok', () => {
        expect.assertions(2);

        let message = roomChannelFactory.createMessage({ room_id: 0 });

        room.postMessage({}).then((res) => {
            expect(res.id).toBe(message.id);
            expect(res.text).toBe(message.text);
        });

        MockPush.__serverRespond('ok', message);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.postMessage({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.postMessage({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('load room attributes', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    let attributes = {
        number: 42,
        string: '',
    };

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.loadAttributes();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_attributes', {});
    });

    test('server responds with ok', () => {
        expect.assertions(1);

        let response = roomChannelFactory.createAttributes({ attributes });

        room.loadAttributes().then((attributes) => {
            expect(attributes).toEqual(attributes);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.loadAttributes().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.loadAttributes().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('update room attributes', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    let attributes = {
        number: 42,
        string: '',
    };

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.updateAttributes(attributes);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('set_attributes', {
            attributes: attributes,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(1);

        let response = roomChannelFactory.createAttributes({ attributes });

        room.updateAttributes(attributes).then((attributes) => {
            expect(attributes).toEqual(attributes);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.updateAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.updateAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('load inbox info', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.loadInboxInfo();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_inbox_info', {});
    });

    test('server responds with ok', () => {
        expect.assertions(4);

        let info = roomChannelFactory.createInboxInfo();

        room.loadInboxInfo().then((res) => {
            expect(res.archived).toBe(info.archived);
            expect(res.assignedTo).toEqual(info.hub_user);
            expect(res.attributes).toEqual(info.attributes);
            expect(res.id).toBe(info.id);
        });

        MockPush.__serverRespond('ok', info);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.loadInboxInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.loadInboxInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('assign room to hub user', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.assignTo(null);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('assign', {
            hub_user: null,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(4);

        let info = roomChannelFactory.createInboxInfo();

        room.assignTo(null).then((res) => {
            expect(res.archived).toBe(info.archived);
            expect(res.assignedTo).toEqual(info.hub_user);
            expect(res.attributes).toEqual(info.attributes);
            expect(res.id).toBe(info.id);
        });

        MockPush.__serverRespond('ok', info);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.assignTo(null).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.assignTo(null).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('disconnect', () => {
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        room.connect();
    });

    test('leaves the channel', () => {
        room.disconnect();

        expect(MockChannel.leave).toHaveBeenCalledTimes(1);
    });

    test('removes the event listeners', () => {
        expect.assertions(0);

        let message = roomChannelFactory.createMessage();

        room.on('message_posted', (data) => {
            expect(data.id).toBe(message.id);
        });

        room.disconnect();

        MockChannel.__serverPush('message_posted', message);
    });
});
