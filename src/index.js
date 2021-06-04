import { USAGE_ERROR, initError } from './errors.js';
import { initKabel } from './kabel.js';
import logger from './logger.js';


// Init the Kabelwerk singleton object.
//
const Kabelwerk = (function() {
    let kabel = null;

    return {

        // Init and return a kabel object. Throw an error if there is already
        // an active kabel object.
        //
        connect: function(params) {
            if (kabel) {
                throw initError(USAGE_ERROR, 'You have already connected!');
            }

            if (!params.url) {
                throw initError(USAGE_ERROR,
                    'Please specify the URL of the Kabelwerk backend ' +
                    'to which to connect.'
                );
            }

            if (!params.token) {
                throw initError(USAGE_ERROR,
                    'Please provide the authentication token of the user ' +
                    'on behalf of which you are connecting.'
                );
            }

            if (params.logging) {
                logger.setLevel(params.logging);
            }

            kabel = initKabel(params.url, params.token);

            return kabel;
        },

        // Delete the current kabel object. Throw an error if there is not one.
        //
        disconnect: function() {
            if (!kabel) {
                throw initError(USAGE_ERROR, 'You have not connected yet!');
            }

            kabel = null;
        },

        // Return the currently active kabel object or throw an error if there
        // is not one.
        //
        getKabel: function() {
            if (!kabel) {
                throw initError(USAGE_ERROR, 'You have not connected yet!');
            }

            return kabel;
        },
    };
})();


export default Kabelwerk;
