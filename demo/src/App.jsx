import React from 'react';
import ReactDOM from 'react-dom';

import { Chat } from './Chat.jsx';
import { KabelwerkProvider } from './KabelwerkContext.jsx';
import { Login } from './Login.jsx';
import { WEBSOCKET_URL } from './backend.js';

const App = () => {
    // the auth token, stored in the local storage
    const [token, setToken] = React.useState(() =>
        localStorage.getItem('kabelwerk_token')
    );

    // update or delete the auth token, also in the local storage
    const updateToken = React.useCallback((value) => {
        if (value) {
            localStorage.setItem('kabelwerk_token', value);
        } else {
            localStorage.removeItem('kabelwerk_token');
        }

        setToken(() => localStorage.getItem('kabelwerk_token'));
    }, []);

    return token ? (
        <KabelwerkProvider config={{ url: WEBSOCKET_URL, token: token }}>
            <Chat resetToken={() => updateToken()} />
        </KabelwerkProvider>
    ) : (
        <Login updateToken={updateToken} />
    );
};

ReactDOM.render(<App />, document.getElementById('app'));
