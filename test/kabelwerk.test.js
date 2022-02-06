import { PayloadFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT } from '../src/errors.js';
import { initKabelwerk } from '../src/kabelwerk.js';

describe('socket connect', () => {
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url: 'url', token: 'token' });
    });

    test('socket params', () => {
        kabelwerk.connect();

        expect(MockSocket.__constructor).toHaveBeenCalledTimes(1);
        expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
        expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
        expect(MockSocket.onError).toHaveBeenCalledTimes(1);
        expect(MockSocket.connect).toHaveBeenCalledTimes(1);
    });

    test('connected event is emitted', () => {
        expect.assertions(1);

        kabelwerk.on('connected', (arg) => {
            expect(arg).toEqual({});
        });

        kabelwerk.connect();
        MockSocket.__open();
    });

    test('disconnected event is emitted', () => {
        expect.assertions(1);

        kabelwerk.on('disconnected', (res) => {
            expect(res).toEqual({});
        });

        kabelwerk.connect();
        MockSocket.onClose.mock.calls[0][0]();
    });

    test('error event is emitted', () => {
        expect.assertions(2);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
        });

        kabelwerk.connect();
        MockSocket.onError.mock.calls[0][0]('timeout');
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        kabelwerk.on('ready', (res) => {
            expect(res).toEqual({});
        });

        kabelwerk.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__open();
            MockPush.__serverRespond('ok', {}, false);
        }
    });

    test('reconnected event is emitted', () => {
        expect.assertions(2);

        kabelwerk.on('reconnected', (arg) => {
            expect(arg).toEqual({});
        });

        kabelwerk.connect();

        for (let i = 0; i < 3; i++) {
            MockSocket.__open();
            MockPush.__serverRespond('ok', {}, false);
        }
    });
});

describe('private channel join', () => {
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.connect();
        MockSocket.__open();
    });

    test('channel topic', () => {
        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith('private');
    });

    test('join error → error event', () => {
        expect.assertions(2);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout', {});
    });

    test('join ok → ready event', () => {
        expect.assertions(5);

        let rawUser = PayloadFactory.user();

        kabelwerk.on('ready', (res) => {
            expect(res).toEqual({});

            let resUser = kabelwerk.getUser();
            expect(resUser.hubId).toBe(rawUser.hub_id);
            expect(resUser.id).toBe(rawUser.id);
            expect(resUser.key).toBe(rawUser.key);
            expect(resUser.name).toBe(rawUser.name);
        });

        MockPush.__serverRespond('ok', rawUser);
    });
});

describe('user info', () => {
    let user = PayloadFactory.user();
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
    });

    test('get user', () => {
        let res = kabelwerk.getUser();

        expect(res.hubId).toBe(user.hub_id);
        expect(res.id).toBe(user.id);
        expect(res.key).toBe(user.key);
        expect(res.name).toBe(user.name);
    });

    test('update user, push params', () => {
        kabelwerk.updateUser({ name: 'anonymous' });

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('update_user', {
            name: 'anonymous',
        });
    });

    test('update user, server responds with ok', () => {
        let newUser = PayloadFactory.user();

        kabelwerk.updateUser({}).then((res) => {
            expect(res.hubId).toBe(newUser.hub_id);
            expect(res.id).toBe(newUser.id);
            expect(res.key).toBe(newUser.key);
            expect(res.name).toBe(newUser.name);

            expect(kabelwerk.getUser()).toEqual(res);
        });

        MockPush.__serverRespond('ok', newUser);
    });

    test('update user, server responds with error', () => {
        let userBefore = kabelwerk.getUser();

        kabelwerk.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(kabelwerk.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('error');
    });

    test('update user, server times out', () => {
        let userBefore = kabelwerk.getUser();

        kabelwerk.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(kabelwerk.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('timeout');
    });

    test('user_updated event', () => {
        expect.assertions(5);

        let newUser = PayloadFactory.user();

        kabelwerk.on('user_updated', (res) => {
            expect(res.hubId).toBe(newUser.hub_id);
            expect(res.id).toBe(newUser.id);
            expect(res.key).toBe(newUser.key);
            expect(res.name).toBe(newUser.name);

            expect(kabelwerk.getUser()).toEqual(res);
        });

        MockChannel.__serverPush('user_updated', newUser);
    });
});

describe('create room', () => {
    let user = PayloadFactory.user();
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
    });

    test('push params, integer', () => {
        kabelwerk.createRoom(42);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('create_room', {
            hub: 42,
        });
    });

    test('push params, string', () => {
        kabelwerk.createRoom('slug');

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('create_room', {
            hub: 'slug',
        });
    });

    test('server responds with ok', () => {
        let response = { id: 42 };

        kabelwerk.createRoom(42).then((res) => {
            expect(res.id).toBe(response.id);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        kabelwerk.createRoom(42).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        kabelwerk.createRoom(42).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('load hub info', () => {
    let user = PayloadFactory.user();
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
    });

    test('push params', () => {
        kabelwerk.loadHubInfo();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_hub', {});
    });

    test('server responds with ok', () => {
        const info = {
            id: 1,
            name: 'Hub',
            users: [
                {
                    id: user.id,
                    key: user.key,
                    name: user.name,
                },
            ],
        };

        kabelwerk.loadHubInfo().then((res) => {
            expect(res.id).toBe(info.id);
            expect(res.name).toBe(info.name);
            expect(res.users.length).toBe(1);

            expect(res.users[0].id).toBe(user.id);
            expect(res.users[0].key).toBe(user.key);
            expect(res.users[0].name).toBe(user.name);
        });

        MockPush.__serverRespond('ok', info);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        kabelwerk.loadHubInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        kabelwerk.loadHubInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('disconnect', () => {
    let user = PayloadFactory.user();
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
    });

    test('leaves the private channel and disconnects the socket', () => {
        kabelwerk.disconnect();

        expect(MockChannel.leave).toHaveBeenCalledTimes(1);
        expect(MockSocket.disconnect).toHaveBeenCalledTimes(1);
    });

    test('removes the event listeners', () => {
        expect.assertions(0);

        kabelwerk.on('user_updated', (data) => {
            expect(data.id).toBe(user.id);
        });

        kabelwerk.disconnect();

        MockChannel.__serverPush('user_updated', user);
    });
});
