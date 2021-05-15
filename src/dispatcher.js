// Init a dispatcher object.
//
const initDispatcher = function(eventNames) {
    let callbacks = eventNames.reduce(function(acc, name) {
        acc[name] = [];
        return acc;
    }, {});

    const checkEventName = function(eventName) {
        if (eventNames.indexOf(eventName) == -1) {
            let message = `Uknown event name: ${eventName}.`;
            throw new Error(message);
        }
    };

    return {

        // Send an event to the callbacks.
        //
        send: function(eventName, params) {
            checkEventName(eventName);

            callbacks[eventName].forEach(function(callback) {
                callback(params);
            });
        },

        // Subscribe to an event.
        //
        on: function(eventName, fn) {
            checkEventName(eventName);

            callbacks[eventName].push(fn);
        },

        // Unsubscribe from an event.
        //
        off: function(eventName) {
            checkEventName(eventName);

            callbacks[eventName] = [];
        },

        // Subscribe to an event and automatically unsubscribe from it after
        // the first time the event is emitted.
        //
        once: function(eventName, fn) {
            checkEventName(eventName);

            callbacks[eventName].push(fn);
        },
    };
};

export { initDispatcher };
