import { jest } from '@jest/globals';

import { Socket } from './mocks/phoenix.js';

const { initKabel } = await import('../src/kabel.js');


test('initKabel inits a socket', () => {
    let kabel = initKabel('url', 'token');
    expect(kabel).toBeTruthy();

    expect(Socket.constructor).toHaveBeenCalledTimes(1);
    expect(Socket.constructor).toHaveBeenCalledWith('url', {params: {token: 'token'}});

    expect(Socket.onOpen).toHaveBeenCalledTimes(1);
    expect(Socket.onClose).toHaveBeenCalledTimes(1);
    expect(Socket.onError).toHaveBeenCalledTimes(1);
    expect(Socket.connect).toHaveBeenCalledTimes(1);
});
