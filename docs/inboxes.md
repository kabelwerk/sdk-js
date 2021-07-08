# Inboxes

An inbox is a view on the rooms the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = kabel.openInbox();

inbox.on('ready', ({ rooms }) => {
    // this event is fired once when the initial list of rooms is loaded
});

inbox.on('updated', ({ rooms }) => {
    // whenever a new message is posted, the list of rooms is updated
    // accordingly and this event is fired
});

inbox.loadMore().then(({ rooms }) => {
    // resolves into the expanded list of rooms
}).catch((error) => {
    // if there are no more rooms, you will get an empty list, not an error
});
```

A room object has the following fields:

- `hubId`: the ID of the hub to which the room belongs;
- `id`: an integer;
- `lastMessage`: the latest message posted in this room; either a message object or `null` if the room is empty;


## On the hub side

Inbox objects are more powerful for hub users. The room objects have a few more fields in addition to those listed above:

- `archived`: a boolean indicating whether the room is currently archived;
- `attributes`: the room's custom attributes (set by `room.setAttributes`);
- `hubUserId`: the ID of the hub user who is assigned to the room, or `null` if nobody is assigned;
- `user`: the user to whom the room belongs, as an `{ id, key, name }` object.

When initing an inbox object, you can (optionally) specify a filter:

```js
const params = {
    archived: true,               // archived rooms

    hubUser: kabel.getUser().id,  // assigned to the connected hub user
    hubUser: null,                // unassigned rooms

    attributes: {                 // set by the end user clients
        country: 'DE',            // e.g. room.setAttributes({ country: 'DE' })
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
