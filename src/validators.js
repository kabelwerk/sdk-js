import { UsageError } from './errors.js';

// Check whether the given value conforms to the given spec. Return the value
// if the check passes, throw a UsageError otherwise.
//
// The spec is expected to be an object with the following keys:
//
// - type → The value must be of this type to pass the validation.
// - nullable → If this flag is set, the value could be null. By default, null
// would cause the validation to fail.
// - each → Only applicable when the type is 'iterable'. You can use this to
// provide a function to call on each element of the iterable; errors are left
// to propagate, causing the validation to fail.
//
// Example usage:
//
//  validate(true, {type: 'boolean'});
//  validate(42, {type: 'integer', nullable: false});
//  validate(null, {type: 'integer', nullable: true});
//  validate([], {type: 'iterable', each: (x) => validate(x, {type: 'map'})})
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

        case 'iterable':
            try {
                for (let item of value) {
                    if (spec.each) {
                        spec.each(item);
                    }
                }
            } catch (error) {
                if (error instanceof TypeError) {
                    throw UsageError(`${value} is not an iterable.`);
                } else {
                    throw error;
                }
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

// Check whether the given value conforms to at least one of the given specs.
//
// Example usage:
//
//  validateOneOf(true, [{type: 'boolean'}, {type: 'integer'}]);
//  validateOneOf(0, [{type: 'string'}, {type: 'datetime'}]);
//
const validateOneOf = function (value, specs) {
    const errors = [];

    for (const spec of specs) {
        try {
            validate(value, spec);
        } catch (error) {
            errors.push(error);
        }
    }

    if (errors.length < specs.length) {
        return value;
    } else {
        throw errors[0];
    }
};

// Check whether each key of the given params object conforms to the spec
// provided under the same key in the spec object. If yes, return a Map with
// the validated key-value pairs; if no, throw a UsageError.
//
// In addition to the keys described above, individual spec objects may also
// contain the following keys:
//
// - optional → If this flag is set, the key may not be present in the params
// object. By default, missing keys cause the validation to fail.
//
// Example usage:
//
//  validateParams({x: true}, {x: {type: 'boolean'}})
//  validateParams({}, {s: {type: 'string', optional: true}})
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
                `Invalid value passed for the parameter '${key}': ${error.message}`,
            );
        }

        map.set(key, value);
    }

    return map;
};

export { validate, validateOneOf, validateParams };
