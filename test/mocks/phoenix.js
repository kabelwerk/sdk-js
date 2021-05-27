import { jest } from '@jest/globals';


const Socket = (function() {
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const onError = jest.fn();
    const connect = jest.fn();

    const constructor = jest.fn().mockImplementation(() => {
        return { onOpen, onClose, onError, connect };
    });

    return { constructor, onOpen, onClose, onError, connect };
})();


jest.mock('phoenix', () => {
    return {
        Socket: Socket.constructor
    };
});


export { Socket };
