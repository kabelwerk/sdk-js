import { validate, validateParams } from '../src/validators.js';

describe('validate', () => {
    test('booleans', () => {
        for (let value of [true, false]) {
            expect(validate(value, { type: 'boolean' })).toBe(value);
        }

        for (let value of [null, 42, '', {}, () => {}]) {
            expect(() => validate(value, { type: 'boolean' })).toThrow(Error);
        }
    });

    test('integers', () => {
        for (let value of [0, 42]) {
            expect(validate(value, { type: 'integer' })).toBe(value);
        }

        for (let value of [null, true, '', {}, () => {}]) {
            expect(() => validate(value, { type: 'integer' })).toThrow(Error);
        }
    });

    test('strings', () => {
        for (let value of ['', 'a string']) {
            expect(validate(value, { type: 'string' })).toBe(value);
        }

        for (let value of [null, true, 42, {}, () => {}]) {
            expect(() => validate(value, { type: 'string' })).toThrow(Error);
        }
    });

    test('maps', () => {
        expect(validate({}, { type: 'map' })).toEqual(new Map());
        expect(validate({ b: 2 }, { type: 'map' })).toEqual(
            new Map([['b', 2]])
        );

        for (let value of [null, false, 42, '', () => {}]) {
            expect(() => validate(value, { type: 'map' })).toThrow(Error);
        }
    });

    test('functions', () => {
        const f = () => {};

        expect(validate(f, { type: 'function' })).toBe(f);

        for (let value of [null, false, 42, '', {}, new Date()]) {
            expect(() => validate(value, { type: 'function' })).toThrow(Error);
        }
    });

    test('datetimes', () => {
        const d = new Date();

        expect(validate(d, { type: 'datetime' })).toEqual(d);

        for (let value of [null, false, 42, '', {}, () => {}]) {
            expect(() => validate(value, { type: 'datetime' })).toThrow(Error);
        }
    });

    test('nullables', () => {
        for (let type of [
            'boolean',
            'integer',
            'string',
            'map',
            'function',
            'datetime',
        ]) {
            expect(validate(null, { type, nullable: true })).toBe(null);
        }
    });
});

describe('validate params', () => {
    test('works', () => {
        expect(
            validateParams(
                { b: true, i: 42, m: { s: '' }, n: null, s: '' },
                {
                    b: { type: 'boolean' },
                    i: { type: 'integer' },
                    m: { type: 'map' },
                    n: { type: 'integer', nullable: true },
                    s: { type: 'string' },
                }
            )
        ).toEqual(
            new Map([
                ['b', true],
                ['i', 42],
                ['m', new Map([['s', '']])],
                ['n', null],
                ['s', ''],
            ])
        );
    });

    test('optionals', () => {
        for (let type of ['boolean', 'integer', 'map']) {
            expect(
                validateParams({}, { x: { type: type, optional: true } })
            ).toEqual(new Map());
        }
    });
});
