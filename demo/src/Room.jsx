import React from 'react';
import Kabelwerk from 'kabelwerk';
// import { Pane } from 'evergreen-ui'

const Room = ({ id }) => {
    // the Kabelwerk room object
    const room = React.useRef(null);

    // whether the room object is ready
    const [isReady, setIsReady] = React.useState(false);

    // the list of loaded messages
    const [messages, setMessages] = React.useState([]);

    // the value of the <textarea> for posting new messages
    const [draft, setDraft] = React.useState('');

    // setup the room object
    React.useEffect(() => {
        room.current = Kabelwerk.openRoom(id);

        room.current.on('ready', ({ messages }) => {
            setMessages(messages);
            setIsReady(true);
        });

        room.current.on('message_posted', (message) => {
            setMessages((messages) => messages.concat(message));
        });

        room.current.connect();

        return () => {
            room.current.disconnect();
            room.current = null;
        };
    }, [id]);

    const onSubmit = function (e) {
        e.preventDefault();

        if (room.current) {
            room.current.postMessage({ text: draft });
            setDraft('');
        }
    };

    if (!isReady) {
        return <p>Loading…</p>;
    } else {
        return (
            <>
                <ul>
                    {messages.map((message) => (
                        <li key={message.id}>{message.text}</li>
                    ))}
                </ul>
                <form onSubmit={onSubmit}>
                    <textarea
                        name="text"
                        required
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />
                    <button type="submit">Send</button>
                </form>
            </>
        );
    }
};

export { Room };
