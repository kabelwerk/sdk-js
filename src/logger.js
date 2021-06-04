import { USAGE_ERROR, initError } from './errors.js';


// logging levels
const LEVELS = {
    SILENT: 60,
    ERROR: 40,
    INFO: 20,
};


// Init the logger singleton obejct.
//
const logger = (function() {
    let level = 60;  // silent by default

    const info = function(info) {
        if (LEVELS.INFO >= level) {
            console.info('[Kabelwerk]', info);
        }
    };

    const error = function(error) {
        if (LEVELS.ERROR >= level) {
            console.error('[Kabelwerk]', error);
        }
    };

    const setLevel = function(levelName) {
        levelName = levelName.toUpperCase();

        if (!LEVELS.hasOwnProperty(levelName)) {
            throw initError(USAGE_ERROR,
                "The logging level has to be one of the following strings " +
                "(case-insensitive): INFO, ERROR, SILENT."
            );
        }

        level = LEVELS[levelName];
    };

    return { info, error, setLevel };
})();


export default logger;
