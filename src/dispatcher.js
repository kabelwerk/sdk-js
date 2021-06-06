import { USAGE_ERROR, initError } from './errors.js';


// Init a dispatcher object.
//
const initDispatcher = function(eventNames) {
    let callbacks = [];  // list of {ref, event, fn} objects

    const checkEventName = function(eventName) {
        if (eventNames.indexOf(eventName) == -1) {
            throw initError(USAGE_ERROR, `Uknown event name: ${eventName}.`);
        }
    };

    const refGenerator = (function() {
        let i = 0;
        return {
            next: function() {
                return (++i).toString();
            }
        };
    })();

    const readyEvent = {
        hasFired: false,
        params: null,
    };

    return {

        // Emit an event: invoke the callbacks listening for the event.
        //
        send: function(event, params) {
            checkEventName(event);

            if (event == 'ready') {
                readyEvent.hasFired = true;
                readyEvent.params = params;
            }

            callbacks.forEach(function(callback) {
                if (callback.event == event) {
                    callback.fn(params);
                }
            });
        },

        // Subscribe to an event. Whenever the event is triggered, the given
        // callback will be invoked.
        //
        // Return a reference which can be used to clear the callback without
        // afecting the other callbacks attached to the event.
        //
        on: function(event, fn) {
            checkEventName(event);

            let ref = refGenerator.next();
            callbacks.push({ ref, event, fn });

            if (event == 'ready' && readyEvent.hasFired) {
                fn(readyEvent.params);
            }

            return ref;
        },

        // Unsubscribe from an event.
        //
        // If no reference for a particular callback is provided, clear all
        // callbacks registered with the event.
        //
        off: function(event, ref) {
            checkEventName(event);

            callbacks = callbacks.filter(function(callback) {
                if (callback.event == event) {
                    if (ref) {
                        return callback.ref !== ref;
                    } else {
                        return false;
                    }
                }
                return true;
            });
        },

        // Subscribe to an event and automatically unsubscribe from it after
        // the first time the event is triggered.
        //
        once: function(event, fn) {
            checkEventName(event);

            let self = this;
            let ref = refGenerator.next();

            callbacks.push({
                ref,
                event,
                fn: function(params) {
                    fn(params);
                    self.off(event, ref);
                }
            });

            if (event == 'ready' && readyEvent.hasFired) {
                fn(readyEvent.params);
                self.off('ready', ref);
            }

            return ref;
        },
    };
};


export { initDispatcher };
