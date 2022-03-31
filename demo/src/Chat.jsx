import Kabelwerk from 'kabelwerk';
import React from 'react';

import { Pane } from 'evergreen-ui';
import { KabelwerkContext } from './KabelwerkContext';
import { Room } from './Room';
import Sidebar from './Sidebar';

const Chat = ({ resetToken }) => {
    const { connState } = React.useContext(KabelwerkContext);
    const [activeRoomId, setActiveRoomId] = React.useState(null);

    if (connState != Kabelwerk.ONLINE) {
        return (
            <>
                <p>
                    {connState == Kabelwerk.CONNECTING
                        ? 'Connecting…'
                        : 'You are offline.'}
                </p>
                <button onClick={resetToken}>Try with a different token</button>
            </>
        );
    }

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
};

export { Chat };
