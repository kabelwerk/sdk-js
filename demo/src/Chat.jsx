import React from 'react';
import { Pane } from 'evergreen-ui';
import { CONN_STATES, KabelwerkContext } from './KabelwerkContext';
import { Room } from './Room';
import Sidebar from './Sidebar';

const Chat = ({ resetToken }) => {
    const { connState } = React.useContext(KabelwerkContext);
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
            <Pane>
                <Sidebar setActiveRoom={(roomId) => setActiveRoomId(roomId)} />
                {activeRoomId ? (
                    <Room id={activeRoomId} />
                ) : (
                    <p>Please select a room to open.</p>
                )}
            </Pane>
        );
    }
};

export { Chat };
