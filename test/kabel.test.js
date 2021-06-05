import { userFactory } from './helpers/factories.js';
import { Channel, Push, Socket } from './mocks/phoenix.js';

import { CONNECTION_ERROR, PUSH_REJECTED, TIMEOUT } from '../src/errors.js';

const { initKabel } = await import('../src/kabel.js');


describe('socket connect', () => {
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
    });

    test('socket params', () => {
        expect(Socket.constructor).toHaveBeenCalledTimes(1);
        expect(Socket.constructor).toHaveBeenCalledWith(
            'url', {params: {token: 'token'}}
        );

        expect(Socket.onOpen).toHaveBeenCalledTimes(1);
        expect(Socket.onClose).toHaveBeenCalledTimes(1);
        expect(Socket.onError).toHaveBeenCalledTimes(1);
        expect(Socket.connect).toHaveBeenCalledTimes(1);
    });

    test('connected event is emitted', () => {
        expect.assertions(1);

        kabel.on('connected', (res) => {
            expect(res).toEqual({});
        });

        Socket.__open();
    });

    test('disconnected event is emitted', () => {
        expect.assertions(1);

        kabel.on('disconnected', (res) => {
            expect(res).toEqual({});
        });

        Socket.onClose.mock.calls[0][0]();
    });

    test('error event is emitted', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
        });

        Socket.onError.mock.calls[0][0]('timeout');
    });
});

describe('private channel join', () => {
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        Socket.__open();
    });

    test('channel topic', () => {
        expect(Socket.channel).toHaveBeenCalledTimes(1);
        expect(Socket.channel).toHaveBeenCalledWith('private');
    });

    test('join error → error event', () => {
        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        Push.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        Push.__serverRespond('timeout', {});
    });

    test('join ok → user_loaded', () => {
        let user = userFactory.create();

        kabel.on('user_loaded', (res) => {
            expect(res).toEqual(user);
        });

        Push.__serverRespond('ok', user);
    });
});

describe('inbox channel join', () => {
    let user = userFactory.create();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        Socket.__open();
        Push.__serverRespond('ok', user, 'clear-initial');
    });

    test('channel topic for an end user', () => {
        expect(Socket.channel).toHaveBeenCalledTimes(2);
        expect(Socket.channel).toHaveBeenLastCalledWith(`user_inbox:${user.id}`);
    });

    test('join error → error event', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);
        });

        Push.__serverRespond('error', {});
    });

    test('join timeout → error event', () => {
        expect.assertions(2);

        kabel.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);
        });

        Push.__serverRespond('timeout', {});
    });

    test('join ok → ready event', () => {
        expect.assertions(1);

        kabel.on('ready', (res) => {
            expect(res).toEqual({});
        });

        Push.__serverRespond('ok', {});
    });

    test('ready event is emitted once', () => {
        expect.assertions(1);

        kabel.on('ready', (res) => {
            expect(res).toEqual({});
        });

        Push.__serverRespond('ok', {}, false);
        Push.__serverRespond('ok', {}, false);
    });
});

describe('user info', () => {
    let user = userFactory.create();
    let kabel = null;

    beforeEach(() => {
        kabel = initKabel('url', 'token');
        Socket.__open();
        Push.__serverRespond('ok', user, 'clear-initial');
        Push.__serverRespond('ok', {});
    });

    test('get user', () => {
        let res = kabel.getUser();
        expect(res).toEqual(user);
    });

    test('update user, server responds with ok', () => {
        let newUser = userFactory.create();

        kabel.updateUser({}).then((res) => {
            expect(res).toEqual(newUser);

            expect(kabel.getUser()).toEqual(newUser);
        });

        Push.__serverRespond('ok', newUser);
    });

    test('update user, server responds with error', () => {
        kabel.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(PUSH_REJECTED);

            expect(kabel.getUser()).toEqual(user);
        });

        Push.__serverRespond('error');
    });

    test('update user, server times out', () => {
        kabel.updateUser({}).catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(TIMEOUT);

            expect(kabel.getUser()).toEqual(user);
        });

        Push.__serverRespond('timeout');
    });

    test('user_updated event', () => {
        expect.assertions(2);

        let newUser = userFactory.create();

        kabel.on('user_updated', (res) => {
            expect(res).toEqual(newUser);

            expect(kabel.getUser()).toEqual(newUser);
        });

        Channel.__serverPush('user_updated', newUser);
    });
});
