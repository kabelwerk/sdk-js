import { CircleArrowLeftIcon, Pane } from 'evergreen-ui';
import Kabelwerk from 'kabelwerk';
import React from 'react';
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
        <Pane display="flex" flexDirection="row" height="100vh">
            <Sidebar
                resetToken={resetToken}
                activeRoomId={activeRoomId}
                setActiveRoom={(roomId) => setActiveRoomId(roomId)}
            />
            {activeRoomId ? (
                <Room id={activeRoomId} />
            ) : (
                <Pane
                    flex="1"
                    display="flex"
                    flexDirection="column"
                    columnGap={10}
                    alignItems="center"
                    justifyContent="center"
                >
                    <p>
                        Welcome to the user-side demo of{' '}
                        <a
                            href="https://docs.kabelwerk.io/js/"
                            title="Kabelwerk's SDK for JavaScript"
                        >
                            Kabelwerk's SDK for JavaScript
                        </a>
                        !
                    </p>
                    <p>
                        To the left is the user's inbox &mdash; one chat room
                        for each hub.
                    </p>
                    <p>Please select a room to open.</p>
                    <CircleArrowLeftIcon />
                </Pane>
            )}
        </Pane>
    );
};

export { Chat };
