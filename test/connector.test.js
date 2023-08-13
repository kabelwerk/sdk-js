import { jest } from '@jest/globals';

import { MockFetch } from './mocks/fetch.js';
import { MockSocket } from './mocks/phoenix.js';

import {
    INACTIVE,
    CONNECTING,
    ONLINE,
    inferUrls,
    initConnector,
} from '../src/connector.js';
import { initDispatcher } from '../src/dispatcher.js';
import { CONNECTION_ERROR, REQUEST_REJECTED } from '../src/errors.js';
import { VERSION } from '../src/version.js';

describe('infer urls', () => {
    test('bad config urls', () => {
        for (let badUrl of ['', 'not a url', 'https://kabelwerk.io']) {
            expect(() => inferUrls(badUrl)).toThrow(
                /not a valid Kabelwerk URL/,
            );
        }
    });

    test('good config urls', () => {
        expect(inferUrls('kabelwerk.io')).toEqual([
            'wss://kabelwerk.io/socket/user',
            'https://kabelwerk.io/socket-api',
        ]);

        expect(inferUrls('ws://kabelwerk.io')).toEqual([
            'ws://kabelwerk.io/socket/user',
            'http://kabelwerk.io/socket-api',
        ]);

        expect(inferUrls('kabelwerk.io/socket/hub')).toEqual([
            'wss://kabelwerk.io/socket/hub',
            'https://kabelwerk.io/socket-api',
        ]);
    });
});

describe('connect', () => {
    const url = 'wss://test.kabelwerk.io/socket/user';
    const token = 'token';
    const refreshToken = jest.fn(() => Promise.resolve(token));

    let dispatcher = null;
    let connector = null;

    beforeEach(() => {
        dispatcher = initDispatcher(['error', 'connected', 'disconnected']);
    });

    test('mock calls, token only', () => {
        expect.assertions(5);

        connector = initConnector({ url, token }, dispatcher);
        connector.connect();

        expect(MockSocket.__constructor).toHaveBeenCalledTimes(1);
        expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
        expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
        expect(MockSocket.onError).toHaveBeenCalledTimes(1);
        expect(MockSocket.connect).toHaveBeenCalledTimes(1);
    });

    test('mock calls, refreshToken only', () => {
        expect.assertions(7);

        connector = initConnector({ url, refreshToken }, dispatcher);

        connector.connect().then(() => {
            expect(MockSocket.__constructor).toHaveBeenCalledTimes(1);
            expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
            expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
            expect(MockSocket.onError).toHaveBeenCalledTimes(1);
            expect(MockSocket.connect).toHaveBeenCalledTimes(1);

            expect(refreshToken).toHaveBeenCalledTimes(1);
            expect(refreshToken).toHaveBeenCalledWith(undefined);
        });
    });

    test('mock calls, token + refreshToken', () => {
        expect.assertions(6);

        connector = initConnector({ url, token, refreshToken }, dispatcher);
        connector.connect();

        expect(MockSocket.__constructor).toHaveBeenCalledTimes(1);
        expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
        expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
        expect(MockSocket.onError).toHaveBeenCalledTimes(1);
        expect(MockSocket.connect).toHaveBeenCalledTimes(1);

        expect(refreshToken).toHaveBeenCalledTimes(0);
    });

    test('no token or refreshToken → error', () => {
        connector = initConnector({ url }, dispatcher);
        expect(connector.connect).toThrow(Error);
        expect(connector.getState()).toBe(INACTIVE);
    });

    test('error obtaining initial token → INACTIVE state, error event', () => {
        expect.assertions(5);

        dispatcher.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
            expect(error.message).toMatch(/failed to obtain an auth token/i);
            expect(error.cause).toBeTruthy();

            expect(connector.getState()).toBe(INACTIVE);
        });

        connector = initConnector(
            { url: url, refreshToken: () => Promise.reject({}) },
            dispatcher,
        );
        connector.connect();
    });

    test('socket opening → CONNECTING state', () => {
        connector = initConnector({ url, token }, dispatcher);
        expect(connector.getState()).toBe(INACTIVE);

        connector.connect();
        expect(connector.getState()).toBe(CONNECTING);
    });

    test('socket opened → ONLINE state, connected event', () => {
        expect.assertions(4);

        dispatcher.on('connected', ({ state }) => {
            expect(state).toBe(ONLINE);
            expect(connector.getState()).toBe(ONLINE);
        });

        connector = initConnector({ url, token }, dispatcher);
        connector.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__open();
        }
    });

    test('socket closed → CONNECTING state, disconnected event', () => {
        expect.assertions(4);

        dispatcher.on('disconnected', ({ state }) => {
            expect(state).toBe(CONNECTING);
            expect(connector.getState()).toBe(CONNECTING);
        });

        connector = initConnector({ url, token }, dispatcher);
        connector.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__close();
        }
    });

    test('socket closed → refresh token', () => {
        expect.assertions(4);

        connector = initConnector({ refreshToken, url }, dispatcher);
        connector.connect();

        MockSocket.__open();
        expect(refreshToken).toHaveBeenCalledTimes(1);
        expect(refreshToken).toHaveBeenLastCalledWith(undefined);

        MockSocket.__close();
        expect(refreshToken).toHaveBeenCalledTimes(2);
        expect(refreshToken).toHaveBeenLastCalledWith(undefined);
    });

    test('socket error → error event', () => {
        expect.assertions(8);

        dispatcher.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
            expect(error.message).toMatch(/closed the websocket connection/i);
            expect(error.cause).toBeTruthy();
        });

        connector = initConnector({ url, token }, dispatcher);
        connector.connect();

        for (let i = 0; i < 2; i++) {
            MockSocket.__error();
        }
    });
});

describe('api call', () => {
    const url = 'wss://example.kabelwerk.io/socket/user';
    const endpointUrl = 'https://example.kabelwerk.io/socket-api/test';

    const token = 'token';
    const refreshToken = jest.fn(() => Promise.resolve('newtoken'));

    let dispatcher = null;
    let connector = null;

    beforeEach(() => {
        dispatcher = initDispatcher(['error', 'connected', 'disconnected']);

        connector = initConnector({ url, token, refreshToken }, dispatcher);
        MockSocket.__open();
    });

    afterEach(() => {
        connector = null;
        dispatcher = null;
    });

    test('request → 200', () => {
        expect.assertions(4);

        MockFetch.__response(200, 'res-data');

        connector.callApi('POST', '/test', 'req-data').then((res) => {
            expect(res).toBe('res-data');

            expect(MockFetch).toHaveBeenCalledTimes(1);
            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(0);
        });
    });

    test('request → 400', () => {
        expect.assertions(6);

        MockFetch.__response(400, 'res-data');

        connector.callApi('POST', '/test', 'req-data').catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(REQUEST_REJECTED);
            expect(error.cause).toBeTruthy();

            expect(MockFetch).toHaveBeenCalledTimes(1);
            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(0);
        });
    });

    test('request → 401 → token refresh → 200', () => {
        expect.assertions(6);

        MockFetch.__response(401);
        MockFetch.__response(200, 'res-data');

        connector.callApi('POST', '/test', 'req-data').then((res) => {
            expect(res).toBe('res-data');

            expect(MockFetch).toHaveBeenCalledTimes(2);

            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });
            expect(MockFetch).toHaveBeenLastCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'newtoken',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(1);
            expect(refreshToken).toHaveBeenCalledWith('token');
        });
    });

    test('request → 401 → token refresh → 401', () => {
        expect.assertions(8);

        MockFetch.__response(401);
        MockFetch.__response(401);

        connector.callApi('POST', '/test', 'req-data').catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(REQUEST_REJECTED);
            expect(error.cause).toBeTruthy();

            expect(MockFetch).toHaveBeenCalledTimes(2);

            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });
            expect(MockFetch).toHaveBeenLastCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'newtoken',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(1);
            expect(refreshToken).toHaveBeenCalledWith('token');
        });
    });

    test('request → 500', () => {
        expect.assertions(6);

        MockFetch.__response(500);

        connector.callApi('POST', '/test', 'req-data').catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(REQUEST_REJECTED);
            expect(error.cause).toBeTruthy();

            expect(MockFetch).toHaveBeenCalledTimes(1);
            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(0);
        });
    });

    test('request → network error', () => {
        expect.assertions(6);

        MockFetch.__error(new TypeError('out of cables'));

        connector.callApi('POST', '/test', 'req-data').catch((error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);
            expect(error.cause).toBeTruthy();

            expect(MockFetch).toHaveBeenCalledTimes(1);
            expect(MockFetch).toHaveBeenCalledWith(endpointUrl, {
                method: 'POST',
                headers: {
                    'Kabelwerk-Token': 'token',
                    'User-Agent': `sdk-js/${VERSION}`,
                },
                body: 'req-data',
            });

            expect(refreshToken).toHaveBeenCalledTimes(0);
        });
    });
});

describe('disconnect', () => {
    const url = 'wss://test.kabelwerk.io/socket/user';
    const token = 'token';

    let dispatcher = null;
    let connector = null;

    beforeEach(() => {
        dispatcher = initDispatcher(['error', 'connected', 'disconnected']);

        connector = initConnector({ url, token }, dispatcher);
    });

    test('socket closed → INACTIVE state, disconnected event', () => {
        expect.assertions(2);

        dispatcher.on('connected', () => {
            connector.disconnect();
        });

        dispatcher.on('disconnected', ({ state }) => {
            expect(state).toBe(INACTIVE);
            expect(connector.getState()).toBe(INACTIVE);
        });

        connector.connect();
        MockSocket.__open();
    });
});
