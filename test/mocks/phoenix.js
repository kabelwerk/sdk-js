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

    const constructor = jest.fn().mockImplementation(() => {
        return MockSocket;
    });

    const channel = jest.fn().mockImplementation(() => {
        return MockChannel;
    });

    // fake the server accepting the connection
    const __open = function () {
        for (let call of onOpen.mock.calls) {
            call[0]();
        }
    };

    return { constructor, onOpen, onClose, onError, connect, channel, __open };
})();

// this is what is imported by src/kabel.js when running the tests
const Socket = MockSocket.constructor;

export { MockPush, MockChannel, MockSocket, Socket };
