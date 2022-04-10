import { jest } from '@jest/globals';

const MockPush = (function () {
    const receive = jest.fn().mockImplementation(() => {
        return MockPush;
    });

    // fake a server response to a push
    //
    // some receive callbacks create other callbacks, mutating the mock.calls
    // list; hence the initialLength hack
    //
    // if clear is true (the default), then the stored callbacks are removed
    // and will not be invoked with the next __serverRespond
    //
    // if the callbacks list was mutated (see above), then only those initial
    // callbacks can be cleared using clear='clear-initial'
    //
    const __serverRespond = function (status, payload, clear = true) {
        let initialLength = receive.mock.calls.length;

        for (let i = 0; i < initialLength; i++) {
            let call = receive.mock.calls[i];

            if (call[0] == status) {
                call[1](payload);
            }
        }

        if (clear) {
            if (clear == 'clear-initial') {
                receive.mock.calls.splice(0, initialLength);
            } else {
                receive.mockClear();
            }
        }
    };

    return { receive, __serverRespond };
})();

const MockChannel = (function () {
    const join = jest.fn().mockImplementation(() => {
        return MockPush;
    });

    const leave = jest.fn();

    const on = jest.fn();

    const push = jest.fn().mockImplementation(() => {
        return MockPush;
    });

    // fake a server downstream message to a channel
    const __serverPush = function (event, payload) {
        for (let call of on.mock.calls) {
            if (call[0] == event) {
                call[1](payload);
            }
        }
    };

    return { join, leave, on, push, __serverPush };
})();

const MockSocket = (function () {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onError = jest.fn();
    const connect = jest.fn();

    const __constructor = jest.fn(() => {
        return MockSocket;
    });

    const channel = jest.fn(() => {
        return MockChannel;
    });

    const disconnect = jest.fn(() => {
        __close({ code: 1000, wasClean: true });
    });

    // fake a websocket open event
    const __open = function () {
        const event = new Event('open');

        for (let call of onOpen.mock.calls) {
            call[0]();
        }
    };

    // fake a websocket close event
    const __close = function (params = {}) {
        // ideally this should be a CloseEvent instance
        const event = new Event('close');

        // if no websocket connection close code is provided, default to the
        // code used by Firefox when the server drops the connection
        event.code = 'code' in params ? params.code : 1006;

        // cleanly closed means that there has been a closing handshake
        event.wasClean = 'wasClean' in params ? params.wasClean : false;

        for (let call of onClose.mock.calls) {
            call[0](event);
        }
    };

    // fake a websocket error event
    const __error = function () {
        const event = new Event('error');

        for (let call of onError.mock.calls) {
            call[0](event);
        }
    };

    return {
        __close,
        __constructor,
        __error,
        __open,
        connect,
        channel,
        disconnect,
        onClose,
        onError,
        onOpen,
    };
})();

// this is what is imported by src/kabel.js when running the tests
const Socket = MockSocket.__constructor;

export { MockPush, MockChannel, MockSocket, Socket };
