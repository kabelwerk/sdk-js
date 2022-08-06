import { jest } from '@jest/globals';

const MockFetch = jest.fn();

// mock a server response
MockFetch.__response = function (status, data) {
    MockFetch.mockImplementationOnce(() => {
        const body = JSON.stringify(data);
        const response = new Response(body, { status: status });

        return Promise.resolve(response);
    });
};

// mock a network error
MockFetch.__error = function (error) {
    MockFetch.mockImplementationOnce(() => {
        return Promise.reject(error);
    });
};

global.fetch = MockFetch;

export { MockFetch };
