import Kabelwerk from 'kabelwerk';
import React from 'react';

const CONN_STATES = Object.freeze({
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
            logging: 'info',
        });

        Kabelwerk.on('connected', () => setConnState(CONN_STATES.ONLINE));
        Kabelwerk.on('reconnected', () => setConnState(CONN_STATES.ONLINE));
        Kabelwerk.on('disconnected', () =>
            setConnState(CONN_STATES.RECONNECTING)
        );

        Kabelwerk.on('ready', () => {
            inbox.current = Kabelwerk.openInbox();

            inbox.current.on('ready', ({ items }) => {
                if (items.length === 0) {
                    Kabelwerk.createRoom(1);
                }
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

const Chat = function ({ resetToken }) {
    const { connState, inboxItems } = React.useContext(KabelwerkContext);

    const [activeRoomId, setActiveRoomId] = React.useState(null);

    if (connState == CONN_STATES.START) {
        return <p>Loading…</p>;
    } else if (
        connState in [CONN_STATES.CONNECTING, CONN_STATES.RECONNECTING]
    ) {
        return (
            <>
                <p>Connecting…</p>
                <button onClick={resetToken}>Try with a different token</button>
            </>
        );
    } else {
        return (
            <>
                <ul>
                    {inboxItems.map((item) => (
                        <li
                            key={item.room.id}
                            onClick={() => setActiveRoomId(item.room.id)}
                        >
                            {item.room.id}
                        </li>
                    ))}
                </ul>
                <button onClick={resetToken}>Logout</button>
                {activeRoomId ? (
                    <Room id={activeRoomId} />
                ) : (
                    <p>Please select a room to open.</p>
                )}
            </>
        );
    }
};

const Room = function ({ id }) {
    // the Kabelwerk room object
    const room = React.useRef(null);

    // whether the room object is ready
    const [isReady, setIsReady] = React.useState(false);

    // the list of loaded messages
    const [messages, setMessages] = React.useState([]);

    // the value of the <textarea> for posting new messages
    const [draft, setDraft] = React.useState('');

    // setup the room object
    React.useEffect(() => {
        room.current = Kabelwerk.openRoom(id);

        room.current.on('ready', ({ messages }) => {
            setMessages(messages);
            setIsReady(true);
        });

        room.current.on('message_posted', (message) => {
            setMessages((messages) => messages.concat(message));
        });

        room.current.connect();

        return () => {
            room.current.disconnect();
            room.current = null;
        };
    }, [id]);

    const onSubmit = function (e) {
        e.preventDefault();

        if (room.current) {
            room.current.postMessage({ text: draft });
            setDraft('');
        }
    };

    if (!isReady) {
        return <p>Loading…</p>;
    } else {
        return (
            <>
                <ul>
                    {messages.map((message) => (
                        <li key={message.id}>{message.text}</li>
                    ))}
                </ul>
                <form onSubmit={onSubmit}>
                    <textarea
                        name="text"
                        required
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <button type="submit">Send</button>
                </form>
            </>
        );
    }
};

export { Chat, KabelwerkProvider };
