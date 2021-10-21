import { USAGE_ERROR, initError } from './errors.js';

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
            throw initError(USAGE_ERROR, 'This value cannot be null.');
        }
    }

    switch (spec.type) {
        case 'boolean':
            if (typeof value != 'boolean') {
                throw initError(USAGE_ERROR, `${value} is not a boolean.`);
            }

            return value;

        case 'integer':
            if (!Number.isInteger(value)) {
                throw initError(USAGE_ERROR, `${value} is not an integer.`);
            }

            return value;

        case 'map':
            if (typeof value != 'object') {
                throw initError(USAGE_ERROR, `${value} is not an object.`);
            }

            return new Map(Object.entries(value));
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
                throw initError(
                    USAGE_ERROR,
                    `The parameter '${key}' is required.`
                );
            }
        }

        try {
            value = validate(value, spec[key]);
        } catch (error) {
            throw initError(
                USAGE_ERROR,
                `Invalid value passed to the parameter '${key}': ${error.message}`
            );
        }

        map.set(key, value);
    }

    return map;
};

export { validate, validateParams };
