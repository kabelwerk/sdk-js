import React from 'react';
import ReactDOM from 'react-dom';
import { Chat, KabelwerkProvider } from './Chat.jsx';
import { Login } from './Login.jsx';

const loadStoredConfig = function () {
    let config = Object.create(null);

    for (let key of ['url', 'token', 'name']) {
        let value = localStorage.getItem(`kabelwerk_${key}`);
        config[key] = value != null ? value : '';
    }

    return config;
};

const App = function () {
    // the config is a {url, token, name} object
    const [config, setConfig] = React.useState(loadStoredConfig);

    const updateConfig = React.useCallback((config) => {
        for (let key of ['url', 'token', 'name']) {
            if (config[key]) {
                localStorage.setItem(`kabelwerk_${key}`, config[key]);
            } else {
                localStorage.removeItem(`kabelwerk_${key}`);
            }
        }

        setConfig(loadStoredConfig);
    }, []);

    const resetToken = React.useCallback(() => {
        localStorage.removeItem('kabelwerk_token');
        setConfig(loadStoredConfig);
    }, []);

    if (config.url && config.token) {
        return (
            <KabelwerkProvider config={config}>
                <Chat resetToken={resetToken} />
            </KabelwerkProvider>
        );
    } else {
        return <Login config={config} updateConfig={updateConfig} />;
    }
};

ReactDOM.render(<App />, document.getElementById('app'));
