import Kabelwerk from 'kabelwerk';
import React from 'react';

const Context = function ({ children, config }) {
    React.useEffect(() => {
        Kabelwerk.config({
            url: config.url,
            token: config.token,
            logging: 'info',
        });

        Kabelwerk.on('ready', () => {
            console.log('ready');
        });

        Kabelwerk.connect();

        return () => {
            Kabelwerk.disconnect();
        };
    }, [config]);

    return children;
};

const Chat = function ({ resetToken }) {
    return (
        <>
            <h1>Hello chat!</h1>
            <button onClick={resetToken}>Logout</button>
        </>
    );
};

export { Chat, Context };
