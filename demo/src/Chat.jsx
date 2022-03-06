import React from 'react';
import { CONN_STATES, KabelwerkContext } from './KabelwerkContext';
import { Room } from './Room';

const Chat = ({ resetToken }) => {
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

export { Chat };
