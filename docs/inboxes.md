# Inboxes

An inbox is a view on the [rooms](./rooms.md) the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = kabel.openInbox();

inbox.on('ready', ({ rooms }) => {
    // this event is fired once when the initial list of inbox rooms is loaded
});

inbox.on('updated', ({ rooms }) => {
    // whenever a new message is posted, the list of inbox rooms is updated
    // accordingly and this event is fired
});

inbox.loadMore().then(({ rooms }) => {
    // resolves into the expanded list of inbox rooms
}).catch((error) => {
    // if there are no more rooms, you will get an empty list, not an error
});
```

An inbox room object has the following fields:

- `hubId`: the ID of the hub to which the room belongs;
- `id`: an integer;
- `lastMessage`: the latest message posted in this room; either a [message object](./rooms.md#messaging) or `null` if the room is empty;

Please note that the inbox room objects just hold information; in order to send and receive messages in these chat rooms, you have to explicitly [init room objects](./rooms.md).


## On the hub side

Inbox objects provide some additional functionality if the connected user is a hub user. First, the inbox room objects have a few more fields in addition to those listed above:

- `archived`: a boolean indicating whether the room is currently archived;
- `assignedTo`: the ID of the hub user who is assigned to the room, or `null` if nobody is assigned;
- `attributes`: the room's custom attributes (set by `room.setAttributes`);
- `user`: the user to whom the room belongs, as an `{ id, key, name }` object.

Also, when initing an inbox object, you can (optionally) specify a filter:

```js
const params = {
    archived: true,                  // archived rooms

    assignedTo: kabel.getUser().id,  // assigned to the connected user
    assignedTo: null,                // unassigned rooms

    attributes: {                    // usually set by the end user client
        country: 'DE',               // with room.updateAttributes()
    },
};

let inbox =  kabel.openInbox(params);

inbox.on('ready', ({ rooms }) => {
    // all rooms are archived, unassigned, and belong to users from Germany
});

inbox.on('updated', ({ rooms }) => {
    // only fired for rooms which meet the criteria set by the params
});
```


## See aso

- [Rooms](./rooms.md)
- [The kabel object](./kabel.md)