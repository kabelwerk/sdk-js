// the host of the Kabelwerk backend serving the app
const HOST = 'hubdemo.kabelwerk.io';

// the websocket URL for the JavaScript SDK
const WEBSOCKET_URL = `wss://${HOST}/socket/user`;

// the endpoint for generating demo users
const GENERATE_USER_URL = `https://${HOST}/api/demo-users`;

// generate a new demo user
const generateUser = function (name) {
    const formData = new FormData();
    formData.append('name', name);

    return fetch(GENERATE_USER_URL, {
        method: 'POST',
        body: formData,
    })
        .then((response) => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`${response.status} — ${response.statusText}`);
            }
        })
        .catch((error) => {
            // convert into a generic error
            throw new Error(
                `The request to the Kabelwerk backend failed with the following error: ${error.message}`
            );
        });
};

export { WEBSOCKET_URL, generateUser };
