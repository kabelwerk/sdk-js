import Kabelwerk from 'kabelwerk';
import React from 'react';

export const CONN_STATES = Object.freeze({
    START: 0,
    CONNECTING: 1,
    ONLINE: 2,
    RECONNECTING: 3,
});

const KabelwerkContext = React.createContext({
    connState: CONN_STATES.START,
    inboxItems: [],
    messages: [],
});

const KabelwerkProvider = function ({ children, config }) {
    // the current connection state, 1 of the 4 CONN_STATES constants
    const [connState, setConnState] = React.useState(CONN_STATES.START);

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

        Kabelwerk.on('connected', () => setConnState(CONN_STATES.ONLINE));

        Kabelwerk.on('disconnected', () =>
            setConnState(CONN_STATES.RECONNECTING)
        );

        Kabelwerk.on('ready', () => {
            inbox.current = Kabelwerk.openInbox();

            inbox.current.on('ready', ({ items }) => {
                setInboxItems(items);
            });

            inbox.current.on('updated', ({ items }) => setInboxItems(items));

            inbox.current.connect();
        });

        Kabelwerk.connect();

        setConnState(CONN_STATES.CONNECTING);

        return () => {
            // this also removes all attached event listeners
            Kabelwerk.disconnect();
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
