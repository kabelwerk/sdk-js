import {
    Heading,
    IconButton,
    Pane,
    SendMessageIcon,
    Textarea,
} from 'evergreen-ui';
import Kabelwerk from 'kabelwerk';
import React from 'react';
import { Message } from './Message';

const Room = ({ id }) => {
    // the Kabelwerk room object
    const room = React.useRef(null);

    // whether the room object is ready
    const [isReady, setIsReady] = React.useState(false);

    // the list of loaded messages
    const [messages, setMessages] = React.useState([]);

    // the hub-side marker — marking the last message read by the hub side
    const [marker, setMarker] = React.useState(null);

    // the value of the <textarea> for posting new messages
    const [draft, setDraft] = React.useState('');

    // setup the room object
    React.useEffect(() => {
        room.current = Kabelwerk.openRoom(id);

        room.current.on('ready', ({ messages, markers }) => {
            setMessages(messages);

            // mark all messages as read as soon as these are loaded
            if (messages.length) {
                room.current.moveMarker();
            }

            // will be null if the hub side has not read any message yet
            if (markers[1] != null) {
                setMarker(markers[1]);
            }

            setIsReady(true);
        });

        // this event is fired whenever a new message is posted in the room,
        // also if the message has been posted by the connected user
        room.current.on('message_posted', (message) => {
            setMessages((messages) => messages.concat(message));

            // mark the message as read
            room.current.moveMarker();
        });

        // this event is fired whenever a message marker is moved in the room,
        // also if it is the marker of the connected user
        room.current.on('marker_moved', (marker) => {
            if (marker.userId != Kabelwerk.getUser().id) {
                setMarker(marker);
            }
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

    const handleSendMessage = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            onSubmit();
        }

        if (e.key === 'Enter' && e.shiftKey) {
            setDraft(draft + '\n');
        }
    };

    const showUserName = (message, prevMessage) => {
        if (prevMessage === undefined) {
            return true;
        }

        return message.user.id !== prevMessage.user.id;
    };

    if (!isReady) {
        return <p>Loading…</p>;
    } else {
        return (
            <Pane
                flex="1"
                height="100vh"
                display="flex"
                flexDirection="column"
                overflowY="scroll"
            >
                <Pane
                    marginBottom={130}
                    marginLeft={30}
                    marginRight={40}
                    marginTop={20}
                >
                    {messages.length === 0 ? (
                        <Pane
                            flex="1"
                            display="flex"
                            flexDirection="row"
                            alignItems="center"
                            justifyContent="center"
                            height="calc(100vh - 100px)"
                        >
                            <Heading
                                fontStyle="italic"
                                size={100}
                                fontSize={11}
                                width="fit-content"
                                marginBottom={8}
                            >
                                No messages yet
                            </Heading>
                        </Pane>
                    ) : (
                        messages.map((message, index) => {
                            return (
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
                            );
                        })
                    )}
                </Pane>
                <Pane
                    position="fixed"
                    bottom={0}
                    width="calc(100vw - 300px)"
                    height={100}
                    display="flex"
                    alignItems="flex-start"
                    backgroundColor="#fff"
                    paddingLeft={32}
                >
                    <Textarea
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
                        marginTop={20}
                    ></IconButton>
                </Pane>
            </Pane>
        );
    }
};

export { Room };
