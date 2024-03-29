import {
  Heading,
  Pane,
  Paragraph,
  SwapHorizontalIcon,
  Tooltip,
} from 'evergreen-ui';
import React from 'react';
import { KabelwerkContext } from './KabelwerkContext';
import { dateToString } from './utils/datetime';
import { ellideText } from './utils/text';

const Sidebar = ({ resetToken, setActiveRoom, activeRoomId }) => {
  const { inboxItems } = React.useContext(KabelwerkContext);

  const renderExcerpt = function (message) {
    if (message.type == 'attachment' || message.type == 'image') {
      return `(${message.type})`;
    } else {
      return ellideText(20, message.text);
    }
  };

  return (
    <Pane flex="0 0 300px" backgroundColor="#696f8c">
      <Heading color="white" size={700} marginX={16} marginY={32}>
        Kabelwerk Demo
        <Tooltip content="Try with a different token">
          <SwapHorizontalIcon
            float="right"
            cursor="pointer"
            onClick={resetToken}
          />
        </Tooltip>
      </Heading>
      {inboxItems.map((item) => (
        <Pane
          key={`${item.room.id}`}
          backgroundColor={
            activeRoomId === item.room.id ? '#8f95b2' : 'transparent'
          }
          borderBottom="1px solid #8f95b2"
          borderTop="1px solid #8f95b2"
          paddingTop={16}
          paddingBottom={16}
          paddingLeft={16}
          paddingRight={8}
          cursor="pointer"
          onClick={() => {
            setActiveRoom(item.room.id);
          }}
        >
          <Pane display="flex" justifyContent="space-between">
            <Pane>
              <Heading color="white" size={500}>
                {item.room.hub.name}
              </Heading>
              {item.message ? (
                <Paragraph color="white">
                  <span>
                    {item.message.user.id == Kabelwerk.getUser().id
                      ? 'you'
                      : item.message.user.name}
                  </span>
                  &nbsp;&mdash;&nbsp;
                  {renderExcerpt(item.message)}
                </Paragraph>
              ) : (
                <Paragraph color="white" fontStyle="italic">
                  no messages yet
                </Paragraph>
              )}
            </Pane>
            {item.message && (
              <Heading marginTop={2} size={100} color="white" textAlign="right">
                {dateToString(item.message.insertedAt)}
              </Heading>
            )}
          </Pane>
        </Pane>
      ))}
    </Pane>
  );
};

export default Sidebar;
