# Rooms


## Creating rooms

```js
kabel.createRoom(hubId).then(({ id }) => {
    let room = kabel.openRoom(id);
}).catch((error) => {
    // e.g. if there already exists a room for this user and hub
});
```


## The room object

```js
let room = kabel.openRoom(roomId);

room.on('ready', ({ messages }) => {
    // this event is fired once when the room is loaded
});
```


### Messaging

```js
room.on('message_posted', (message) => {
    // this event is fired every time a new message is posted in this room
});

room.postMessage({ text }).then((message) => {
    // you will also get the same message via the message_posted event
}).catch((error) => {
    // e.g. if the given text is an empty string
});

room.loadEarlier().then((messages) => {
    // resolves into the list of messages which come right before the earliest
    // message seen by the room object
}).catch((error) => {
    // if there are no more messages, you will get an empty list, not an error
});
```

A message object has the following fields:

- `id`: an integer;
- `insertedAt`: a `Date` instance of when the message was created in the database;
- `roomId`: the ID of the room to which the message belongs;
- `text`: the content of the message;
- `updatedAt`: for the time being the same as `insertedAt`;
- `user`: the user who posted the message, as an `{ id, key, name }` object.


### Custom attributes

```js
room.getAttributes().then((attributes) => {
    attributes.country = 'DE';
    return room.setAttributes(attributes);
}).then((attributes) => {
    console.assert(attributes.country == 'DE');
});
```


### On the hub side

```js
const hubUsers = kabel.listHubUsers();

room.getHubInfo();  // { assignedTo, isArchived }

room.assignTo(hubUsers[0]).then(() => {
    console.assert(room.getHubInfo().assignedTo.id == hubUsers[0].id);
});
```
