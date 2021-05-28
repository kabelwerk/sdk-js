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

test('send → on', () => {
    expect.assertions(1);

    let dispatcher = initDispatcher(['answer']);

    dispatcher.on('answer', (value) => {
        expect(value).toBe(42);
    });

    dispatcher.send('answer', 42);
});

test('send → once', () => {
    expect.assertions(1);

    let dispatcher = initDispatcher(['answer']);

    dispatcher.once('answer', (value) => {
        expect(value).toBe(42);
    });

    dispatcher.send('answer', 42);  // 1 assert
    dispatcher.send('answer', 42);  // no asserts
});

test('off without a ref', () => {
    expect.assertions(2);

    let dispatcher = initDispatcher(['answer']);

    for (let i = 0; i < 2; i++) {
        dispatcher.on('answer', (value) => {
            expect(value).toBe(42);
        });
    }

    dispatcher.send('answer', 42);  // 2 asserts
    dispatcher.off('answer');
    dispatcher.send('answer', 42);  // 0 asserts
});

test('off with a ref', () => {
    expect.assertions(3);

    let dispatcher = initDispatcher(['answer']);

    let ref;
    for (let i = 0; i < 2; i++) {
        ref = dispatcher.on('answer', (value) => {
            expect(value).toBe(42);
        });
    }

    dispatcher.send('answer', 42);  // 2 asserts
    dispatcher.off('answer', ref);
    dispatcher.send('answer', 42);  // 1 assert
});
