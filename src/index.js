import { initKabel } from './kabel.js';


// Init the Kabelwerk singleton object.
//
const Kabelwerk = (function() {
    let kabel = null;

    return {

        // Init and return a kabel object. Throw an error if there is already an
        // active kabel object.
        //
        connect: function(url, token) {
            if (kabel) {
                let message = 'You already have an active kabel object.';
                throw new Error(message);
            }

            kabel = initKabel(url, token);
            return kabel;
        },

        // Delete the current kabel object. Throw an error if there is not one.
        //
        disconnect: function() {
            if (!kabel) {
                let message = 'You have not connected yet!';
                throw new Error(message);
            }

            kabel = null;
        },

        // Return the currently active kabel object or throw an error if there is
        // not one.
        //
        getKabel: function() {
            if (!kabel) {
                let message = 'You have not connected yet!';
                throw new Error(message);
            }

            return kabel;
        },
    };
})();


export default Kabelwerk;
