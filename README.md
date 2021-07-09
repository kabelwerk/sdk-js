# Kabelwerk

This is Kabelwerk's base (low-level) SDK for JavaScript.


## Installation

```sh
npm install kabelwerk
```


## Usage

### Connection

The entry point is the `Kabelwerk.connect` method, which takes as parameters the URL of the Kabelwerk backend to connect to and an authentication token identifying the user (e.g. a JWT token), and returns a connection object.

```js
import Kabelwerk from 'kabelwerk';

let kabel = Kabelwerk.connect({ url, token });

kabel.on('ready', () => {
    // this event is fired once when the intiial connection is established
    let inbox = kabel.openInbox();
    let room = kabel.openRoom();
});

kabel.on('error', (error) => {
    // e.g. when the token is invalid
});
```

The connection object takes care of automatically re-connecting when the connection drops, opening inboxes and rooms (see below), retrieving and updating user info, and logging (silent by default). There can be only one connection object at a time and you can access it using the `Kabelwerk.getKabel` method.

Read more about [the connection object](./docs/kabel.md) in the docs.


### Inboxes

An inbox is a view on the rooms the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = kabel.openInbox();

inbox.on('ready', (rooms) => {
    // this event is fired once when the initial list of rooms is loaded
});

inbox.on('updated', (rooms) => {
    // whenever a new message is posted, the list of rooms is updated
    // accordingly and this event is fired
});
```

Each end user has one room per hub; so if your care team is organised in a single hub, that would be one room per end user. On the other hand, each hub user has access to all rooms belonging to their hub and would often need multiple inboxes to better organise their work.

Read more about [inboxes](./docs/inboxes.md) in the docs.


### Rooms

A room object handles posting and retrieving messages in a chat room.

```js
let room = kabel.openRoom(roomId);

room.on('ready', (messages) => {
    // this event is fired once when the room is loaded
});

room.on('message_posted', (message) => {
    // this event is fired every time a new message is posted in this room
});

room.postMessage({ text }).then((message) => {
    // you will also get the same message via the `message_posted` event
}).catch((error) => {
    // e.g. when the server rejects the message
});

room.loadEarlier().then((messages) => {
    // resolves into the list of messages which come right before the earliest
    // message seen by the room object
}).catch((error) => {
    // if there are no more messages, you will get an empty list, not an error
});
```

You can open as many rooms as you need. However, if you just want to listen for newly posted messages, then it is simpler to leverage the `inbox.on('updated')` hook.

Read more about [rooms](./docs/rooms.md) in the docs.


## Contributing

Please refer to [CONTRIBUTING.md](https://github.com/kabelwerk/sdk-js/blob/master/CONTRIBUTING.md) if you have found a bug or if you want to setup the project locally.


## Licence

Licensed under the [MIT](https://github.com/kabelwerk/sdk-js/blob/master/LICENSE) licence.
