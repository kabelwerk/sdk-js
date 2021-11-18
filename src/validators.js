import { UsageError } from './errors.js';

// Example usage:
//
//  validate(true, {type: 'boolean'});
//  validate(42, {type: 'integer', nullable: false});
//  validate(null, {type: 'integer', nullable: true});
//
const validate = function (value, spec) {
    if (value === null) {
        if (spec.nullable) {
            return null;
        } else {
            throw UsageError('This value cannot be null.');
        }
    }

    switch (spec.type) {
        case 'boolean':
            if (typeof value != 'boolean') {
                throw UsageError(`${value} is not a boolean.`);
            }

            return value;

        case 'integer':
            if (!Number.isInteger(value)) {
                throw UsageError(`${value} is not an integer.`);
            }

            return value;

        case 'string':
            if (typeof value != 'string') {
                throw UsageError(`${value} is not a string.`);
            }

            return value;

        case 'map':
            if (typeof value != 'object') {
                throw UsageError(`${value} is not an object.`);
            }

            return new Map(Object.entries(value));

        case 'function':
            if (typeof value != 'function') {
                throw UsageError(`${value} is not a function.`);
            }

            return value;

        case 'datetime':
            if (!(value instanceof Date)) {
                throw UsageError(`${value} is not a Date object.`);
            }

            // yeah.. this is a magical string check
            if (value.toString() == 'Invalid Date') {
                throw UsageError(`${value} is not a valid datetime.`);
            }

            return value;
    }
};

// Example usage:
//
//  validateParams({x: true}, {x: {type: 'boolean'}})
//
const validateParams = function (params, spec) {
    let map = new Map();

    for (let key of Object.keys(spec)) {
        let value = params[key];

        if (typeof value == 'undefined') {
            if (spec[key].optional) {
                continue;
            } else {
                throw UsageError(`The parameter '${key}' is required.`);
            }
        }

        try {
            value = validate(value, spec[key]);
        } catch (error) {
            throw UsageError(
                `Invalid value passed for the parameter '${key}': ${error.message}`
            );
        }

        map.set(key, value);
    }

    return map;
};

export { validate, validateParams };
