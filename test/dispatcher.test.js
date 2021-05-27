import { jest } from '@jest/globals';

import { initDispatcher } from '../src/dispatcher.js';


test('on/off/once unknown event', () => {
    let dispatcher = initDispatcher(['test']);

    expect(function() {
        dispatcher.on('unknown', () => {});
    }).toThrow();

    expect(function() {
        dispatcher.off('unknown');
    }).toThrow();

    expect(function() {
        dispatcher.once('unknown', () => {});
    }).toThrow();
});

test('send → on works', (done) => {
    let dispatcher = initDispatcher(['test']);

    const callback = function(value) {
        expect(value).toBe(42);
        done();
    };

    dispatcher.on('test', callback);
    dispatcher.send('test', 42);
});
