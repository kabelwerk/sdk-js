import { Socket } from 'phoenix';

import { ConnectionError } from './errors.js';
import logger from './logger.js';
import { VERSION } from './version.js';

const INACTIVE = 0;
const CONNECTING = 1;
const ONLINE = 2;

// Init a connector.
//
// A connector is a wrapper around a Phoenix socket, which maintains the
// Kabelwerk state (see the constants above), and handles auth token obtaining
// (before the first connect) and refreshing (after an unexpected disconnect).
// It also makes easier testing and reseting of Kabelwerk objects.
//
const initConnector = function (config, dispatcher) {
    let state = INACTIVE;

    let token = config.token;
    let tokenIsRefreshing = false;

    const refreshToken = function () {
        if (config.refreshToken) {
            return config.refreshToken(token).then((newToken) => {
                token = newToken;
                return token;
            });
        } else {
            return Promise.resolve(token);
        }
    };

    const socket = new Socket(config.url, {
        params: function () {
            return {
                token: token,
                agent: `sdk-js/${VERSION}`,
            };
        },
        logger: function (kind, msg, data) {
            logger.debug(`${kind}: ${msg}`, data);
        },
    });

    socket.onOpen(function () {
        logger.info('Websocket connected.');

        state = ONLINE;

        dispatcher.send('connected', { state });
    });

    socket.onClose(function (event) {
        logger.info('Websocket disconnected.', event);

        state = INACTIVE;

        dispatcher.send('disconnected', { state });
    });

    socket.onError(function (error) {
        logger.error('Websocket error.', error);

        state = CONNECTING;

        dispatcher.send('error', ConnectionError(error));

        if (config.refreshToken && !tokenIsRefreshing) {
            tokenIsRefreshing = true;

            refreshToken()
                .then(function () {
                    logger.info('Auth token refreshed.');
                    tokenIsRefreshing = false;
                })
                .catch(function (error) {
                    logger.error('Failed to refresh auth token.', error);
                    tokenIsRefreshing = false;
                });
        }
    });

    return {
        connect: function () {
            return refreshToken()
                .then(() => {
                    socket.connect();
                })
                .catch((error) => {
                    dispatcher.send('error', error);
                });
        },

        disconnect: function () {
            socket.disconnect();
        },

        getSocket: function () {
            return socket;
        },

        getState: function () {
            return state;
        },
    };
};

export { INACTIVE, CONNECTING, ONLINE, initConnector };
