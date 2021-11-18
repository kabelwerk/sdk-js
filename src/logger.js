import { UsageError } from './errors.js';

// logging levels
const LEVELS = {
    SILENT: 60,
    ERROR: 40,
    INFO: 20,
    DEBUG: 10,
};

// Init the logger singleton obejct.
//
const logger = (function () {
    let level = 60; // silent by default

    const debug = function (message, obj = ' ') {
        if (LEVELS.DEBUG >= level) {
            console && console.debug('[Kabelwerk]', message, obj);
        }
    };

    const info = function (message, obj = ' ') {
        if (LEVELS.INFO >= level) {
            console && console.info('[Kabelwerk]', message, obj);
        }
    };

    const error = function (message, obj = ' ') {
        if (LEVELS.ERROR >= level) {
            console && console.error('[Kabelwerk]', message, obj);
        }
    };

    const setLevel = function (levelName) {
        levelName = levelName.toUpperCase();

        if (!LEVELS.hasOwnProperty(levelName)) {
            throw UsageError(
                'The logging level has to be one of the following strings ' +
                    '(case-insensitive): DEBUG, INFO, ERROR, SILENT.'
            );
        }

        level = LEVELS[levelName];
    };

    return { debug, info, error, setLevel };
})();

export default logger;
