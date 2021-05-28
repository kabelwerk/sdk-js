// Init a dispatcher object.
//
const initDispatcher = function(eventNames) {
    let callbacks = [];  // list of {ref, event, fn} objects

    const checkEventName = function(eventName) {
        if (eventNames.indexOf(eventName) == -1) {
            let message = `Uknown event name: ${eventName}.`;
            throw new Error(message);
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

    return {

        // Emit an event: invoke the callbacks listening for the event.
        //
        send: function(event, params) {
            checkEventName(event);

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

            return ref;
        },
    };
};

export { initDispatcher };
