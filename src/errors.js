// This module contains the errors which are raised or returned by the SDK.
//
// The errors are standard Error instances with the name attribute set to a
// string specifying the error type. This is because extending the built-in
// Error class is not well supported in JavaScript.
//
// Example usage:
//
//  throw UsageError('This is how you raise an error!');
//  throw Timeout();
//

//
// the error names (types)
//

export const USAGE_ERROR = 'UsageError';
export const CONNECTION_ERROR = 'ConnectionError';
export const PUSH_REJECTED = 'PushRejected';
export const REQUEST_REJECTED = 'RequestRejected';
export const TIMEOUT = 'Timeout';

//
// the errors (functions that return Error instances)
//

// An error to be raised when the SDK is not used as expected — e.g. a method
// is called with a wrong argument.
//
export const UsageError = function (message) {
    if (!message) {
        message = 'Unexpected usage.';
    }

    const error = new Error(message);
    error.name = USAGE_ERROR;

    return error;
};

// An error to be raised when the websocket fails to connect to the server or
// when an API request fails due to a network error.
//
export const ConnectionError = function (message, cause) {
    if (!message) {
        message = 'Failed to connect to the server.';
    }

    const error = new Error(message);
    error.name = CONNECTION_ERROR;
    error.cause = cause;

    return error;
};

// An error to be raised when a websocket message sent upstream is rejected by
// the server.
//
export const PushRejected = function (message) {
    if (!message) {
        message = 'The server rejected the request.';
    }

    const error = new Error(message);
    error.name = PUSH_REJECTED;

    return error;
};

// An error to be raised when an API request is rejected by the server.
//
export const RequestRejected = function (message, response) {
    if (!message) {
        message = 'The server rejected the request.';
    }

    const error = new Error(message);
    error.name = REQUEST_REJECTED;
    error.cause = response;

    return error;
};

// An error to be raised when a websocket message sent upstream does not get
// back a response.
//
export const Timeout = function (message) {
    if (!message) {
        message = 'The server timed out.';
    }

    const error = new Error(message);
    error.name = TIMEOUT;

    return error;
};
