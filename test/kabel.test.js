import { privateChannelFactory } from './helpers/factories.js';
import { MockChannel, MockPush, MockSocket } from './mocks/phoenix.js';

import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT } from '../src/errors.js';
import { initKabel } from '../src/kabel.js';


describe('socket connect', () => {
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
    });

    test('socket params', () => {
        expect(MockSocket.constructor).toHaveBeenCalledTimes(1);
        expect(MockSocket.constructor).toHaveBeenCalledWith(
            'url', {params: {token: 'token'}}
        );

        expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
        expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
        expect(MockSocket.onError).toHaveBeenCalledTimes(1);
        expect(MockSocket.connect).toHaveBeenCalledTimes(1);
    });

    test('connected event is emitted', () => {
        expect.assertions(1);

        kabel.on('connected', (res) => {
            expect(res).toEqual({});
        });

        MockSocket.__open();
    });

    test('disconnected event is emitted', () => {
        expect.assertions(1);

        kabel.on('disconnected', (res) => {
            expect(res).toEqual({});
        });

        MockSocket.onClose.mock.calls[0][0]();
    });

    test('error event is emitted', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
        });

        MockSocket.onError.mock.calls[0][0]('timeout');
    });
});

describe('private channel join', () => {
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        MockSocket.__open();
    });

    test('channel topic', () => {
        expect(MockSocket.channel).toHaveBeenCalledTimes(1);
        expect(MockSocket.channel).toHaveBeenCalledWith('private');
    });

    test('join error → error event', () => {
        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout', {});
    });

    test('join ok → user_loaded', () => {
        let user = privateChannelFactory.createOwnUser();

        kabel.on('user_loaded', (res) => {
            expect(res.hubId).toBe(user.hub_id);
            expect(res.id).toBe(user.id);
            expect(res.key).toBe(user.key);
            expect(res.name).toBe(user.name);
        });

        MockPush.__serverRespond('ok', user);
    });
});

describe('inbox channel join', () => {
    let user = privateChannelFactory.createOwnUser();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
    });

    test('channel topic for an end user', () => {
        expect(MockSocket.channel).toHaveBeenCalledTimes(2);
        expect(MockSocket.channel).toHaveBeenLastCalledWith(`user_inbox:${user.id}`);
    });

    test('join error → error event', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout', {});
    });

    test('join ok → ready event', () => {
        expect.assertions(1);

        kabel.on('ready', (res) => {
            expect(res).toEqual({});
        });

        MockPush.__serverRespond('ok', {});
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        kabel.on('ready', (res) => {
            expect(res).toEqual({});
        });

        MockPush.__serverRespond('ok', {}, false);
        MockPush.__serverRespond('ok', {}, false);
    });
});

describe('user info', () => {
    let user = privateChannelFactory.createOwnUser();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
        MockPush.__serverRespond('ok', {});
    });

    test('get user', () => {
        let res = kabel.getUser();

        expect(res.hubId).toBe(user.hub_id);
        expect(res.id).toBe(user.id);
        expect(res.key).toBe(user.key);
        expect(res.name).toBe(user.name);
    });

    test('update user, server responds with ok', () => {
        let newUser = privateChannelFactory.createOwnUser();

        kabel.updateUser({}).then((res) => {
            expect(res.hubId).toBe(newUser.hub_id);
            expect(res.id).toBe(newUser.id);
            expect(res.key).toBe(newUser.key);
            expect(res.name).toBe(newUser.name);

            expect(kabel.getUser()).toEqual(res);
        });

        MockPush.__serverRespond('ok', newUser);
    });

    test('update user, server responds with error', () => {
        let userBefore = kabel.getUser();

        kabel.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(kabel.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('error');
    });

    test('update user, server times out', () => {
        let userBefore = kabel.getUser();

        kabel.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(kabel.getUser()).toEqual(userBefore);
        });

        MockPush.__serverRespond('timeout');
    });

    test('user_updated event', () => {
        expect.assertions(5);

        let newUser = privateChannelFactory.createOwnUser();

        kabel.on('user_updated', (res) => {
            expect(res.hubId).toBe(newUser.hub_id);
            expect(res.id).toBe(newUser.id);
            expect(res.key).toBe(newUser.key);
            expect(res.name).toBe(newUser.name);

            expect(kabel.getUser()).toEqual(res);
        });

        MockChannel.__serverPush('user_updated', newUser);
    });
});

describe('create room', () => {
    let user = privateChannelFactory.createOwnUser();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
        MockPush.__serverRespond('ok', {});
    });

    test('push params', () => {
        kabel.createRoom();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('create_room', {hub: 1});
    });

    test('server responds with ok', () => {
        let response = {id: 42};

        kabel.createRoom().then((res) => {
            expect(res.id).toBe(response.id);
        });

        MockPush.__serverRespond('ok', response);
    });

    test('server responds with error', () => {
        expect.assertions(2);

        kabel.createRoom().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        kabel.createRoom().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});

describe('load hub info', () => {
    let user = privateChannelFactory.createOwnUser();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        MockSocket.__open();
        MockPush.__serverRespond('ok', user, 'clear-initial');
        MockPush.__serverRespond('ok', {});
    });

    test('push params', () => {
        kabel.loadHubInfo();

        expect(MockChannel.push).toHaveBeenCalledTimes(1);
        expect(MockChannel.push).toHaveBeenCalledWith('get_hub', {});
    });

    test('server responds with ok', () => {
        const info = {
            id: 1,
            name: 'Hub',
            users: [{
                id: user.id,
                key: user.key,
                name: user.name,
            }],
        };

        kabel.loadHubInfo().then((res) => {
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

        kabel.loadHubInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        MockPush.__serverRespond('error');
    });

    test('server times out', () => {
        expect.assertions(2);

        kabel.loadHubInfo().catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        MockPush.__serverRespond('timeout');
    });
});
