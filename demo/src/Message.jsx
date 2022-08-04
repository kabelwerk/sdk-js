import { EyeOnIcon, Heading, Pane, Text, Tooltip } from 'evergreen-ui';
import Kabelwerk from 'kabelwerk';
import React from 'react';
import { dateToString } from './utils/datetime';

const Message = ({ message, showUserName, isLastMessage, marker }) => {
  const isOwnMessage = Kabelwerk.getUser().id === message.user.id;
  const lastMessage = React.useRef();

  React.useEffect(() => {
    if (isLastMessage) {
      lastMessage.current.scrollIntoView();
    }
  }, []);

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
        <Heading size={100} fontSize={11} width="fit-content" marginBottom={8}>
          {message.user.name}
        </Heading>
      )}
      <Pane display="flex" alignItems="flex-end">
        <Pane
          backgroundColor="#EBF0FF"
          key={message.id}
          elevation={2}
          width="fit-content"
          marginTop={4}
          paddingBottom={8}
          paddingLeft={14}
          paddingRight={14}
          borderRadius={5}
          maxWidth="75vw"
          display="flex"
          flexDirection="column"
        >
          {message.type == 'image' ? (
            <p>
              <a
                href={message.upload.original.url}
                target="_blank"
                title={message.upload.name + ' — click to open in a new tab'}
              >
                <img
                  src={message.upload.preview.url}
                  width={message.upload.preview.width}
                  height={message.upload.preview.height}
                  alt={message.upload.name}
                />
              </a>
            </p>
          ) : (
            <Text>
              <div dangerouslySetInnerHTML={{ __html: message.html }}></div>
            </Text>
          )}
          <Heading size={100} textAlign="right">
            {dateToString(message.insertedAt)}
          </Heading>
        </Pane>
        {marker !== undefined && (
          <Pane marginRight={-20}>
            <Tooltip content={'seen ' + dateToString(marker.updatedAt)}>
              <EyeOnIcon marginLeft={5} color="grey" cursor="help" />
            </Tooltip>
          </Pane>
        )}
      </Pane>
    </Pane>
  );
};

export { Message };
