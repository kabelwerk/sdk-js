import { jest } from '@jest/globals';

import { MockSocket } from './mocks/phoenix.js';

import {
    INACTIVE,
    CONNECTING,
    ONLINE,
    initConnector,
} from '../src/connector.js';
import { initDispatcher } from '../src/dispatcher.js';
import { CONNECTION_ERROR } from '../src/errors.js';

describe('connect', () => {
    const url = 'url';
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
        expect.assertions(6);

        connector = initConnector({ url, refreshToken }, dispatcher);

        connector.connect().then(() => {
            expect(MockSocket.__constructor).toHaveBeenCalledTimes(1);
            expect(MockSocket.onOpen).toHaveBeenCalledTimes(1);
            expect(MockSocket.onClose).toHaveBeenCalledTimes(1);
            expect(MockSocket.onError).toHaveBeenCalledTimes(1);
            expect(MockSocket.connect).toHaveBeenCalledTimes(1);

            expect(refreshToken).toHaveBeenCalledTimes(1);
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

    test('socket error → CONNECTING state, error event', () => {
        expect.assertions(3);

        dispatcher.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);

            expect(connector.getState()).toBe(CONNECTING);
        });

        connector = initConnector({ url, token }, dispatcher);
        connector.connect();

        MockSocket.onError.mock.calls[0][0]('timeout');
    });

    test('error obtaining initial token → INACTIVE state, error event', () => {
        expect.assertions(3);

        dispatcher.on('error', (error) => {
            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe(CONNECTION_ERROR);

            expect(connector.getState()).toBe(INACTIVE);
        });

        connector = initConnector(
            { url: url, refreshToken: () => Promise.reject() },
            dispatcher
        );
        connector.connect();
    });
});

describe('disconnect', () => {
    const url = 'url';
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
