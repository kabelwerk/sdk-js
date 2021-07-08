import { roomChannelFactory } from './helpers/factories.js';
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
        let message = roomChannelFactory.createMessage({room_id: 0});

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

describe('message posted event', () => {
    let initialResponse = roomChannelFactory.createMessageList(1);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
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

        room.loadEarlier().then((res) => {
            expect(res.length).toBe(1);
            expect(res[0].id).toBe(response.messages[0].id);
            expect(res[0].text).toBe(response.messages[0].text);
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
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.postMessage({text: 'hello server!'});

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

describe('get room attributes', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    let attributes = {
        number: 42,
        string: '',
    };

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.getAttributes();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_attributes', {});
    });

    test('server responds with ok', () => {
        expect.assertions(1);

        let response = roomChannelFactory.createAttributes({ attributes });

        room.getAttributes().then((attributes) => {
            expect(attributes).toEqual(attributes);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.getAttributes().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.getAttributes().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('set room attributes', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    let attributes = {
        number: 42,
        string: '',
    };

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.setAttributes(attributes);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('set_attributes', {
            attributes: attributes,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(1);

        let response = roomChannelFactory.createAttributes({ attributes });

        room.setAttributes(attributes).then((attributes) => {
            expect(attributes).toEqual(attributes);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.setAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.setAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('get inbox info', () => {
    let initialResponse = roomChannelFactory.createMessageList(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.getInboxInfo();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_inbox_info', {});
    });

    test('server responds with ok', () => {
        expect.assertions(4);

        let info = roomChannelFactory.createInboxInfo();

        room.getInboxInfo().then((res) => {
            expect(res.archived).toBe(info.archived);
            expect(res.attributes).toEqual(info.attributes);
            expect(res.hubUser).toEqual(info.hub_user);
            expect(res.id).toBe(info.id);
        });

        MockPush.__serverRespond('ok', info);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.getInboxInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.getInboxInfo().catch((error) => {
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
        MockPush.__serverRespond('ok', initialResponse);
    });

    test('push params', () => {
        room.assign(null);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('assign', {
            hub_user: null,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(4);

        let info = roomChannelFactory.createInboxInfo();

        room.assign(null).then((res) => {
            expect(res.archived).toBe(info.archived);
            expect(res.attributes).toEqual(info.attributes);
            expect(res.hubUser).toEqual(info.hub_user);
            expect(res.id).toBe(info.id);
        });

        MockPush.__serverRespond('ok', info);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.assign(null).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.assign(null).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});
