import Kabelwerk from 'kabelwerk';
import React from 'react';

const KabelwerkContext = React.createContext({
    connState: Kabelwerk.getState(),
    inboxItems: [],
});

const KabelwerkProvider = function ({ children, config }) {
    // the current connection state
    const [connState, setConnState] = React.useState(Kabelwerk.getState);

    // the Kabelwerk inbox object
    const inbox = React.useRef(null);

    // the list of Kabelwerk inbox items
    const [inboxItems, setInboxItems] = React.useState([]);

    // setup the Kabelwerk object
    React.useEffect(() => {
        Kabelwerk.config({
            url: config.url,
            token: config.token,
            ensureRooms: 'all',
            logging: 'info',
        });

        Kabelwerk.on('connected', () => setConnState(Kabelwerk.getState));

        Kabelwerk.on('disconnected', () => setConnState(Kabelwerk.getState));

        Kabelwerk.on('ready', () => {
            inbox.current = Kabelwerk.openInbox();

            inbox.current.on('ready', ({ items }) => setInboxItems(items));

            inbox.current.on('updated', ({ items }) => setInboxItems(items));

            inbox.current.connect();

            if (config.name) {
                Kabelwerk.updateUser({ name: config.name });
            }
        });

        Kabelwerk.connect();

        setConnState(Kabelwerk.getState);

        return () => {
            // this also removes all attached event listeners
            Kabelwerk.disconnect();

            setConnState(Kabelwerk.getState);
        };
    }, [config]);

    return (
        <KabelwerkContext.Provider
            value={{
                connState,
                inboxItems,
            }}
        >
            {children}
        </KabelwerkContext.Provider>
    );
};

export { KabelwerkProvider, KabelwerkContext };
