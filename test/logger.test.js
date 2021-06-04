import { jest } from '@jest/globals';

import logger from '../src/logger.js';


describe('tests with mock console', () => {
    let mockConsole = {};

    beforeEach(() => {
        mockConsole.info = jest.spyOn(console, 'info').mockImplementation();
        mockConsole.error = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
        mockConsole.info.mockRestore();
        mockConsole.error.mockRestore();

        logger.setLevel('silent');
    });

    test('setting unknown level throws an error', () => {
        expect(() => {
            logger.setLevel('hallo!');
        }).toThrow(Error);
    });

    test('level info', () => {
        logger.info('hallo!');
        expect(mockConsole.info).toHaveBeenCalledTimes(0);

        logger.setLevel('info');
        logger.info('hallo!');
        expect(mockConsole.info).toHaveBeenCalledTimes(1);
    });

    test('level error', () => {
        logger.error('hallo!');
        expect(mockConsole.error).toHaveBeenCalledTimes(0);

        logger.setLevel('error');
        logger.error('hallo!');
        expect(mockConsole.error).toHaveBeenCalledTimes(1);
    })
});
