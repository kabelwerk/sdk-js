// when the SDK is not used as expected
const USAGE_ERROR = 'UsageError';

// when a websocket frame sent upstream is rejected by the Kabelwerk backend
const PUSH_REJECTED = 'PushRejected';

// when a websocket frame sent upstream does not get an answer back
const TIMEOUT = 'Timeout';


// Init an Error instance.
//
// Store the type of error in Error.prototype.name, as extending the built-in
// Error class is not well supported [1].
//
// If no message is given, provide one depending on the error type.
//
// [1]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/name
//
const initError = function(type, message) {
    if (!message) {
        if (type == USAGE_ERROR) {
            message = 'Unexpected usage.';
        } else if (type == PUSH_REJECTED) {
            message = 'The server rejected the request.';
        } else if (type == TIMEOUT) {
            message = 'The server timed out.';
        }
    }

    let error = new Error(message);
    error.name = type;

    return error;
};


export { USAGE_ERROR, PUSH_REJECTED, TIMEOUT, initError };
