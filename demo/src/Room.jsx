import { IconButton, Pane, SendMessageIcon, Textarea } from 'evergreen-ui';
import Kabelwerk from 'kabelwerk';
import React from 'react';
import { Message } from './Message';

const Room = ({ id }) => {
    // the Kabelwerk room object
    const room = React.useRef(null);
    const [marker, setMarker] = React.useState(null);

    // whether the room object is ready
    const [isReady, setIsReady] = React.useState(false);

    // the list of loaded messages
    const [messages, setMessages] = React.useState([]);

    // the value of the <textarea> for posting new messages
    const [draft, setDraft] = React.useState('');

    const handleSendMessage = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            onSubmit();
        }

        if (e.key === 'Enter' && e.shiftKey) {
            setDraft(draft + '\n');
        }
    };

    // setup the room object
    React.useEffect(() => {
        room.current = Kabelwerk.openRoom(id);

        room.current.on('ready', ({ messages, markers }) => {
            setMessages(messages);
            setMarker(markers[1]);
            setIsReady(true);
        });

        room.current.on('message_posted', (message) => {
            setMessages((messages) => messages.concat(message));
        });

        room.current.on('marker_moved', () => {
            setMarker(room.current.getMarkers()[1]);
        });

        room.current.connect();

        return () => {
            room.current.disconnect();
            room.current = null;
        };
    }, [id]);

    const onSubmit = function () {
        if (draft.length > 0) {
            if (room.current) {
                room.current.postMessage({ text: draft });
                setDraft('');
            }
        }
    };

    const showUserName = (message, prevMessage) => {
        if (prevMessage === undefined) {
            return false;
        }

        return message.user.id !== prevMessage.user.id;
    };

    if (!isReady) {
        return <p>Loading…</p>;
    } else {
        return (
            <Pane
                // height={'80vh'}
                display="flex"
                flexDirection="column"
            >
                <Pane marginBottom={130} marginLeft={40} marginRight={40}>
                    {messages.map((message, index) => {
                        return (
                            <>
                                <Pane
                                    key={message.id}
                                    display="flex"
                                    flexDirection="column"
                                >
                                    <Message
                                        marker={
                                            marker?.messageId === message.id
                                                ? marker
                                                : undefined
                                        }
                                        isLastMessage={
                                            index === messages.length - 1
                                        }
                                        message={message}
                                        showUserName={showUserName(
                                            message,
                                            messages.length === index - 1
                                                ? undefined
                                                : messages[index - 1]
                                        )}
                                    />
                                </Pane>
                            </>
                        );
                    })}
                </Pane>
                <Pane
                    position="fixed"
                    bottom={0}
                    width="100vw"
                    height={120}
                    display="flex"
                    alignItems="center"
                    backgroundColor="#fff"
                    paddingLeft={32}
                >
                    <Textarea
                        type="text"
                        value={draft}
                        fontSize={14}
                        placeholder="Write a message"
                        onChange={(e) => {
                            setDraft(e.target.value);
                        }}
                        onKeyUp={(e) => {
                            handleSendMessage(e);
                        }}
                    />
                    <IconButton
                        onClick={onSubmit}
                        icon={SendMessageIcon}
                        appearance="minimal"
                        size="large"
                        disabled={draft.length == 0}
                    ></IconButton>
                </Pane>
            </Pane>
        );
    }
};

export { Room };
