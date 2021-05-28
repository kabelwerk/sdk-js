import { jest } from '@jest/globals';


const Push = (function() {
    const receive = jest.fn();

    // fake a server response to a push
    const __serverRespond = function(status, payload) {
        for (let call of receive.mock.calls) {
            if (call[0] == status) {
                call[1](payload);
            }
        }
    };

    return { receive, __serverRespond };
}());


const Channel = (function() {
    const join = jest.fn();
    const on = jest.fn();

    const push = jest.fn().mockImplementation(() => {
        return Push;
    });

    // fake a server downstream message to a channel
    const __serverPush = function(event, payload) {
        for (let call of on.mock.calls) {
            if (call[0] == event) {
                call[1](payload);
            }
        }
    };

    return { join, on, push, __serverPush };
}());


const Socket = (function() {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onError = jest.fn();
    const connect = jest.fn();

    const constructor = jest.fn().mockImplementation(() => {
        return { onOpen, onClose, onError, connect };
    });

    const channel = jest.fn().mockImplementation(() => {
        return Channel;
    });

    return { constructor, onOpen, onClose, onError, connect, channel };
})();


jest.mock('phoenix', () => {
    return {
        Socket: Socket.constructor
    };
});


export { Push, Channel, Socket };
