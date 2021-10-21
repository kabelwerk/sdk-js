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
        let joinRes = roomChannelFactory.createJoin(0);

        expect.assertions(1);

        room.on('ready', ({ messages }) => {
            expect(messages).toEqual([]);
        });

        room.connect();

        MockPush.__serverRespond('ok', joinRes, false);
        MockPush.__serverRespond('ok', joinRes, false);
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
        let joinRes = roomChannelFactory.createJoin(0);
        let message = roomChannelFactory.createMessage({ room_id: 0 });

        expect.assertions(1);

        room.on('message_posted', (res) => {
            expect(res.id).toBe(message.id);
        });

        room.connect();

        // first join
        MockPush.__serverRespond('ok', joinRes, false);

        // rejoin
        joinRes.messages.push(message);
        MockPush.__serverRespond('ok', joinRes, false);
    });
});

describe('message posted event', () => {
    let initialResponse = roomChannelFactory.createJoin(1);
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
    let initialResponse = roomChannelFactory.createJoin(1);
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

        let response = roomChannelFactory.createMessages(1);

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
    let initialResponse = roomChannelFactory.createJoin(0);
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

        room.postMessage({ text: 'hello server!' }).then((res) => {
            expect(res.id).toBe(message.id);
            expect(res.text).toBe(message.text);
        });

        MockPush.__serverRespond('ok', message);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        room.postMessage({ text: 'hello server!' }).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        room.postMessage({ text: 'hello server!' }).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('get room user', () => {
    let joinRes = roomChannelFactory.createJoin(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
    });

    test('throws an error if called before ready', () => {
        expect(room.getUser).toThrow(Error);
    });

    test('returns the user otherwise', () => {
        expect.assertions(1);

        room.on('ready', () => {
            let user = room.getUser();

            expect(user).toEqual(joinRes.user);
        });

        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('the user is updated on rejoin', () => {
        room.connect();

        // first join
        MockPush.__serverRespond('ok', joinRes, false);

        expect(room.getUser()).toEqual(joinRes.user);

        // rejoin
        let newJoinRes = roomChannelFactory.createJoin(0);
        MockPush.__serverRespond('ok', newJoinRes, false);

        expect(room.getUser()).toEqual(newJoinRes.user);
    });
});

describe('get room attributes', () => {
    const attributes = {
        number: 42,
        string: '',
    };

    let joinRes = roomChannelFactory.createJoin(0, { attributes });
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0);
    });

    test('throws an error if called before ready', () => {
        expect(room.getAttributes).toThrow(Error);
    });

    test('returns the attributes otherwise', () => {
        expect.assertions(1);

        room.on('ready', () => {
            let res = room.getAttributes();

            expect(res).toEqual(attributes);
        });

        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('the attributes are updated on rejoin', () => {
        room.connect();

        // first join
        MockPush.__serverRespond('ok', joinRes, false);

        expect(room.getAttributes()).toEqual(attributes);

        // rejoin
        let newJoinRes = roomChannelFactory.createJoin(0, { attributes: {} });
        MockPush.__serverRespond('ok', newJoinRes, false);

        expect(room.getAttributes()).toEqual({});
    });
});

describe('update room attributes', () => {
    let initialResponse = roomChannelFactory.createJoin(0);
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
        expect.assertions(2);

        let response = roomChannelFactory.createRoom({ attributes });

        room.updateAttributes(attributes).then((attributes) => {
            expect(attributes).toEqual(attributes);

            expect(room.getAttributes()).toEqual(attributes);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(3);

        room.updateAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(room.getAttributes()).toEqual({});
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(3);

        room.updateAttributes(attributes).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(room.getAttributes()).toEqual({});
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('get archive status', () => {
    const joinRes = roomChannelFactory.createHubJoin(0);

    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0, true);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('throws an error if called before ready', () => {
        room = initRoom(MockSocket, 0, true);
        room.connect();

        expect(room.isArchived).toThrow(Error);
    });

    test('throws an error if not on the hub side', () => {
        room = initRoom(MockSocket, 0, false);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);

        expect(room.isArchived).toThrow(Error);
    });

    test('returns the archive status otherwise', () => {
        expect(room.isArchived()).toEqual(false);
    });
});

describe('update archive status, archive', () => {
    const joinRes = roomChannelFactory.createHubJoin(0);
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0, true);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('throws an error if not on the hub side', () => {
        room = initRoom(MockSocket, 0, false);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);

        expect(room.archive).toThrow(Error);
    });

    test('push params', () => {
        room.archive();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('set_inbox_info', {
            archive: true,
            until: null,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = roomChannelFactory.createHubRoom({ archived: true });

        room.archive().then((info) => {
            expect(info.archived).toBe(true);
            expect(info.id).toBe(response.id);

            expect(room.isArchived()).toBe(true);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(3);

        room.archive().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(room.isArchived()).toBe(false);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(3);

        room.archive().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(room.isArchived()).toBe(false);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('update archive status, unarchive', () => {
    const joinRes = roomChannelFactory.createHubJoin(0, { archived: true });
    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0, true);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('throws an error if not on the hub side', () => {
        room = initRoom(MockSocket, 0, false);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);

        expect(room.unarchive).toThrow(Error);
    });

    test('push params', () => {
        room.unarchive();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('set_inbox_info', {
            archive: false,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = roomChannelFactory.createHubRoom({ archived: false });

        room.unarchive().then((info) => {
            expect(info.archived).toBe(response.archived);
            expect(info.id).toBe(response.id);

            expect(room.isArchived()).toBe(false);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(3);

        room.unarchive().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(room.isArchived()).toBe(true);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(3);

        room.unarchive().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(room.isArchived()).toBe(true);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('get hub user', () => {
    const hubUser = { id: 1, name: 'Batou', key: 'batou' };
    const joinRes = roomChannelFactory.createHubJoin(0, { hub_user: hubUser });

    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0, true);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('throws an error if called before ready', () => {
        room = initRoom(MockSocket, 0, true);
        room.connect();

        expect(room.getHubUser).toThrow(Error);
    });

    test('throws an error if not on the hub side', () => {
        room = initRoom(MockSocket, 0, false);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);

        expect(room.getHubUser).toThrow(Error);
    });

    test('returns the hub user otherwise', () => {
        expect(room.getHubUser()).toEqual(hubUser);
    });
});

describe('update hub user', () => {
    const hubUser = { id: 42, name: 'Batou', key: 'batou' };
    const joinRes = roomChannelFactory.createHubJoin(0);

    let room = null;

    beforeEach(() => {
        room = initRoom(MockSocket, 0, true);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('throws an error if not on the hub side', () => {
        room = initRoom(MockSocket, 0, false);
        room.connect();
        MockPush.__serverRespond('ok', joinRes);

        expect(() => room.updateHubUser(null)).toThrow(Error);
    });

    test('push params', () => {
        room.updateHubUser(42);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('set_inbox_info', {
            hub_user: 42,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(3);

        let response = roomChannelFactory.createHubRoom({ hub_user: hubUser });

        room.updateHubUser(42).then((info) => {
            expect(info.hubUser).toEqual(response.hub_user);
            expect(info.id).toBe(response.id);

            expect(room.getHubUser()).toEqual(hubUser);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(3);

        room.updateHubUser(42).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(room.getHubUser()).toBe(null);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(3);

        room.updateHubUser(42).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(room.getHubUser()).toBe(null);
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
