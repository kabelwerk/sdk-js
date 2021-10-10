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
        expect.assertions(1);

        let response = roomChannelFactory.createRoom({ attributes });

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
    let initialResponse = roomChannelFactory.createJoin(0);
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

        let info = roomChannelFactory.createHubRoom();

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
    let initialResponse = roomChannelFactory.createJoin(0);
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

        let info = roomChannelFactory.createHubRoom();

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
