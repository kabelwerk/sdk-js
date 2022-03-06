import React from 'react';
import { Heading, Pane, Text } from 'evergreen-ui';
import Kabelwerk from 'kabelwerk';
import { dateToString } from './utils/datetime';

const Message = ({ message, showUserName, isLastMessage }) => {
    const isOwnMessage = Kabelwerk.getUser().id === message.user.id;
    const lastMessage = React.useRef()
    
    React.useEffect(() => {
        if (isLastMessage) {
            lastMessage.current.scrollIntoView()
        }
    }, [])

    return (
        <Pane
            margin={4}
            alignSelf={isOwnMessage ? 'flex-end' : 'flex-start'}
            display="flex"
            flexDirection="column"
            alignItems={isOwnMessage ? 'flex-end' : 'flex-start'}
            ref={lastMessage}
        >
            {showUserName && (
                <Heading
                    size={100}
                    fontSize={11}
                    width="fit-content"
                    marginBottom={8}
                >
                    {message.user.name}
                </Heading>
            )}
            <Pane
                backgroundColor={isOwnMessage ? '#EBF0FF' : '#EBF0FF'}
                key={message.id}
                elevation={2}
                width="fit-content"
                marginTop={4}
                padding={8}
                paddingTop={8}
                paddingBottom={8}
                paddingLeft={16}
                paddingRight={16}
                borderRadius={5}
                maxWidth="75vw"
                display="flex"
                flexDirection="column"
            >
                <Text>{message.text}</Text>
                <Heading marginTop={2} size={100} textAlign="right">
                    {dateToString(message.insertedAt)}
                </Heading>
            </Pane>
        </Pane>
    );
};

export { Message };
