import { PayloadFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT } from '../src/errors.js';
import { initKabelwerk } from '../src/kabelwerk.js';

const url = 'wss://test.kabelwerk.io/socket/user';
const token = 'token';

describe('connect', () => {
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
    });

    test('socket opening → CONNECTING state', () => {
        expect(kabelwerk.getState()).toBe(kabelwerk.INACTIVE);

        kabelwerk.connect();

        expect(kabelwerk.getState()).toBe(kabelwerk.CONNECTING);
    });

    test('socket error → CONNECTING state, error event', () => {
        expect.assertions(3);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);

            expect(kabelwerk.getState()).toBe(kabelwerk.CONNECTING);
        });

        kabelwerk.connect();
        MockSocket.__error();
    });

    test('socket opened → ONLINE state, connected event', () => {
        expect.assertions(2);

        kabelwerk.on('connected', ({ state }) => {
            expect(state).toBe(kabelwerk.ONLINE);
            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.connect();
        MockSocket.__open();
    });

    test('socket opened → join private channel', () => {
        kabelwerk.connect();
        expect(MockSocket.channel).toHaveBeenCalledTimes(0);

        MockSocket.__open();
        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith(
            'private',
            expect.any(Function),
        );
    });

    test('join error → error + disconnected events', () => {
        expect.assertions(4);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.on('disconnected', () => {
            expect(kabelwerk.getState()).toBe(kabelwerk.INACTIVE);
        });

        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(3);

        kabelwerk.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('timeout', {});
    });

    test('join ok → ready event', () => {
        expect.assertions(5);

        const rawUser = PayloadFactory.user();
        const joinRes = PayloadFactory.privateJoin({ user: rawUser });

        kabelwerk.on('ready', ({ user }) => {
            expect(user.hubId).toBe(rawUser.hub_id);
            expect(user.id).toBe(rawUser.id);
            expect(user.key).toBe(rawUser.key);
            expect(user.name).toBe(rawUser.name);

            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.connect();
        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__open();
            MockPush.__serverRespond('ok', PayloadFactory.privateJoin(), false);
        }
    });

    test('connected event is emitted each time', () => {
        expect.assertions(4);

        kabelwerk.on('connected', ({ state }) => {
            expect(state).toBe(kabelwerk.ONLINE);
            expect(kabelwerk.getState()).toBe(kabelwerk.ONLINE);
        });

        kabelwerk.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__open();
            MockPush.__serverRespond('ok', PayloadFactory.privateJoin(), false);
        }
    });
});

describe('user info', () => {
    const user = PayloadFactory.user();
    const joinRes = PayloadFactory.privateJoin({ user });

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes, 'clear-initial');
    });

    test('get user', () => {
        const res = kabelwerk.getUser();

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
        const newUser = PayloadFactory.user();

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
        const userBefore = kabelwerk.getUser();

        kabelwerk.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(kabelwerk.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('error');
    });

    test('update user, server times out', () => {
        const userBefore = kabelwerk.getUser();

        kabelwerk.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(kabelwerk.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('timeout');
    });

    test('user_updated event', () => {
        expect.assertions(5);

        const newUser = PayloadFactory.user();

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

describe('update device', () => {
    const params = {
        pushNotificationsToken: 'TOKEN',
        pushNotificationsEnabled: false,
    };

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', PayloadFactory.privateJoin());
    });

    test('push params', () => {
        kabelwerk.updateDevice(params);

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('update_device', {
            push_notifications_token: 'TOKEN',
            push_notifications_enabled: false,
        });
    });

    test('server responds with ok', () => {
        expect.assertions(5);

        const device = PayloadFactory.device();

        kabelwerk.updateDevice(params).then((res) => {
            expect(res.id).toBe(device.id);
            expect(res.insertedAt.toJSON()).toBe(device.inserted_at);
            expect(res.pushNotificationsEnabled).toBe(false);
            expect(res.pushNotificationsToken).toBe('TOKEN');
            expect(res.updatedAt.toJSON()).toBe(device.updated_at);
        });

        MockPush.__serverRespond('ok', device);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        kabelwerk.updateDevice(params).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        kabelwerk.updateDevice(params).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('create room', () => {
    const user = PayloadFactory.user();
    const joinRes = PayloadFactory.privateJoin({ user });

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes, 'clear-initial');
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
    const user = PayloadFactory.user();
    const joinRes = PayloadFactory.privateJoin({ user });

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes, 'clear-initial');
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

describe('open methods', () => {
    const user = PayloadFactory.user();
    const joinRes = PayloadFactory.privateJoin({ user });

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();
    });

    test('open inbox', () => {
        expect.assertions(2);

        expect(kabelwerk.openInbox).toThrow(Error);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.openInbox()).toBeTruthy();
        });

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('open notifier', () => {
        expect.assertions(2);

        expect(kabelwerk.openNotifier).toThrow(Error);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.openNotifier()).toBeTruthy();
        });

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('open room', () => {
        expect.assertions(2);

        expect(() => kabelwerk.openRoom(42)).toThrow(Error);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.openRoom(42)).toBeTruthy();
        });

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('open any room, user has no rooms', () => {
        expect.assertions(1);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.openRoom).toThrow(Error);
        });

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes);
    });

    test('open any room, room ID available', () => {
        expect.assertions(1);

        kabelwerk.on('ready', () => {
            expect(kabelwerk.openRoom()).toBeTruthy();
        });

        MockSocket.__open();
        MockPush.__serverRespond(
            'ok',
            PayloadFactory.privateJoin({ user, room_ids: [42] }),
        );
    });
});

describe('ping', () => {
    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', PayloadFactory.privateJoin());
    });

    test('mock calls', () => {
        const callback = () => {};

        expect(kabelwerk.ping(callback)).toBe(true);
        expect(MockSocket.ping).toHaveBeenCalledTimes(1);
        expect(MockSocket.ping).toHaveBeenCalledWith(callback);
    });
});

describe('disconnect', () => {
    const user = PayloadFactory.user();
    const joinRes = PayloadFactory.privateJoin({ user });

    let kabelwerk = null;

    beforeEach(() => {
        kabelwerk = initKabelwerk();
        kabelwerk.config({ url, token });
        kabelwerk.connect();

        MockSocket.__open();
        MockPush.__serverRespond('ok', joinRes, 'clear-initial');
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
