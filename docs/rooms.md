# Rooms

A room is where chat messages are exchanged between an end user on one side and your care team (hub users) on the other side.

To init a room object, you need the room's ID (usually you would obtain it from an [inbox](./inboxes.md)):

```js
let room = kabel.openRoom(roomId);

room.on('ready', ({ messages }) => {
    // this event is fired once when the room is loaded
});
```

If the room does not exist yet, it has to be explicitly created (usually by the client of the end user) before the room object can be inited:

```js
kabel.createRoom(hubId).then(({ id }) => {
    let room = kabel.openRoom(id);
}).catch((error) => {
    // e.g. if there already exists a room for this user and hub
});
```


## Messaging

```js
room.on('message_posted', (message) => {
    // this event is fired every time a new message is posted in this room
});

room.postMessage({ text }).then((message) => {
    // you will also get the same message via the message_posted event
}).catch((error) => {
    // e.g. if the given text is an empty string
});

room.loadEarlier().then(({ messages }) => {
    // resolves into the list of messages which come right before the earliest
    // message seen by the room object
}).catch((error) => {
    // if there are no more messages, you will get an empty list, not an error
});
```

A message object has the following fields:

- `id`: an integer;
- `insertedAt`: a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) instance of when the message was created in the database;
- `roomId`: the ID of the room to which the message belongs;
- `text`: the content of the message;
- `updatedAt`: for the time being the same as `insertedAt`;
- `user`: the user who posted the message, as an `{ id, key, name }` object.


## Custom attributes

```js
room.loadAttributes().then((attributes) => {
    attributes.country = 'DE';
    return room.updateAttributes(attributes);
}).then((attributes) => {
    console.assert(attributes.country == 'DE');
}).catch((error) => {
    // e.g. if the server times out
});
```


## On the hub side

Room objects provide some additional functionality if the connected user is a hub user:

```js
room.loadInboxInfo().then((inboxInfo) => {
    // { archived, assignedTo, attributes }
}).catch((error) => {
    // e.g. if the connected user is not a hub user
});

room.assignTo(kabel.getUser().id).then((inboxInfo) => {
    // { archived, assignedTo, attributes }
}).catch((error) => {
    // e.g. if the connected user is not a hub user
});
```


## See also

- [Inboxes](./inboxes.md)
- [The kabel object](./kabel.md)
