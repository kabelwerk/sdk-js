import {
    Heading,
    Pane,
    Paragraph,
    RecordIcon,
    SwapHorizontalIcon,
    Text,
    Tooltip,
} from 'evergreen-ui';
import React from 'react';
import { KabelwerkContext } from './KabelwerkContext';
import { dateToString } from './utils/datetime';
import { ellideText } from './utils/text';

const Sidebar = ({ resetToken, setActiveRoom }) => {
    const { inboxItems } = React.useContext(KabelwerkContext);

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
                    key={`${item.room.id}-${item.message?.id}`}
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
                                    <strong>{item.message.user.name}</strong>:{' '}
                                    {ellideText(20, item.message.text)}
                                </Paragraph>
                            ) : (
                                <Paragraph color="white" fontStyle="italic">
                                    no messages yet.
                                </Paragraph>
                            )}
                        </Pane>
                        {item.message && (
                            <Heading
                                marginTop={2}
                                size={100}
                                color="white"
                                textAlign="right"
                            >
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
