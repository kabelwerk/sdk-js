# Kabelwerk

This is the [Kabelwerk](https://kabelwerk.io) base (low-level) SDK for JavaScript.

## Installation

```sh
npm install kabelwerk
```

## Usage

### Connection

The entry point is the `Kabelwerk` object, which opens and maintains the websocket connection to the Kabelwerk backend.

```js
import Kabelwerk from 'kabelwerk';

Kabelwerk.config({ url, token });

Kabelwerk.on('ready', () => {
    // this event is fired once when the initial connection is established
    let inbox = Kabelwerk.openInbox();
    let room = Kabelwerk.openRoom();
});

Kabelwerk.on('error', (error) => {
    // e.g. when the token is invalid
});

Kabelwerk.connect();
```

The `Kabelwerk` object takes care of automatically re-connecting when the connection drops, opening inboxes and rooms (see below), retrieving and updating user info, and logging (silent by default).

Read more about [the Kabelwerk object](./docs/kabelwerk.md) in the docs.

### Inboxes

An inbox is a view on the rooms the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = Kabelwerk.openInbox();

inbox.on('ready', ({ items }) => {
    // this event is fired once when the initial list of inbox items is loaded
});

inbox.on('updated', ({ items }) => {
    // whenever a new message is posted, the list of inbox items is updated
    // accordingly and this event is fired
});

inbox.connect();
```

Read more about [inboxes](./docs/inboxes.md) in the docs.

### Rooms

A room object handles posting and retrieving messages in a chat room.

```js
let room = Kabelwerk.openRoom(roomId);

room.on('ready', ({ messages }) => {
    // this event is fired once when the room is loaded
});

room.on('message_posted', (message) => {
    // this event is fired every time a new message is posted in this room
});

room.connect();

room.postMessage({ text })
    .then((message) => {
        // you will also get the same message via the `message_posted` event
    })
    .catch((error) => {
        // e.g. when the server rejects the message
    });

room.loadEarlier()
    .then(({ messages }) => {
        // resolves into the list of messages which come right before the earliest
        // message seen by the room object
    })
    .catch((error) => {
        // if there are no more messages, you will get an empty list, not an error
    });
```

You can open as many rooms as you need. However, if you just want to listen for newly posted messages, then it is simpler to leverage the `inbox.on('updated')` event.

Read more about [rooms](./docs/rooms.md) in the docs.

## Contributing

Please refer to [CONTRIBUTING.md](./CONTRIBUTING.md) if you have found a bug or if you want to setup the project locally.

## Licence

Licensed under the [MIT](./LICENSE) licence.
