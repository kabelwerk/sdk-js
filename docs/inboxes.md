# Inboxes

An inbox is a view on the [rooms](./rooms.md) the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = Kabelwerk.openInbox();

inbox.on('ready', ({ rooms }) => {
    // this event is fired once when the initial list of inbox rooms is loaded
});

inbox.on('updated', ({ rooms }) => {
    // whenever a new message is posted, the list of inbox rooms is updated
    // accordingly and this event is fired
});

// bring it to life, preferably after attaching the desired event listeners
inbox.connect();

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

Each end user has one room per hub; so if your care team is organised in a single hub, an end user's inbox will contain (at most) one room. On the other hand, each hub user has access to all rooms belonging to their hub and would often need multiple inboxes to better organise their work.


## On the hub side

Inbox objects provide some additional functionality if the connected user is a hub user. First, the inbox room objects have a few more fields in addition to those listed above:

- `archived`: a boolean indicating whether the room is currently archived;
- `assignedTo`: the ID of the hub user who is assigned to the room, or `null` if nobody is assigned;
- `attributes`: the room's custom attributes (set by `room.setAttributes`);
- `user`: the user to whom the room belongs, as an `{ id, key, name }` object.

Also, when initing an inbox object, you can (optionally) specify a filter:

```js
const params = {
    archived: true,                      // archived rooms

    assignedTo: Kabelwerk.getUser().id,  // assigned to the connected user
    assignedTo: null,                    // unassigned rooms

    attributes: {                        // usually set by the end user client
        country: 'DE',                   // with room.updateAttributes()
    },
};

let inbox =  Kabelwerk.openInbox(params);

inbox.on('ready', ({ rooms }) => {
    // all rooms are archived, unassigned, and belong to users from Germany
});

inbox.on('updated', ({ rooms }) => {
    // only fired for rooms which meet the criteria set by the params
});

inbox.connect();
```


## List of methods

- **`inbox.connect()`** → Establishes connection to the server. Usually all event listeners should be already attached when this method is invoked.
- **`inbox.disconnect()`** → Removes all previously attached event listeners and closes the connection to the server.
- **`inbox.listRooms()`** → Returns the list of rooms already loaded by the inbox. The list is sorted by the rooms' latest messages (the room with the most recent message comes first).
- **`inbox.loadMore()`** → Loads more rooms. Returns a Promise which resolves into a `{rooms}` object containing the updated list of rooms.
- **`inbox.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the inbox object are removed.
- **`inbox.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `inbox.off(event, ref)` method.
- **`inbox.once(event, listener)`** → The same as the `inbox.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.


## List of events

- `error` → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
- `ready` → Fired at most once, when the connection to the server is first established. The attached listeners are called with an object containing the list of initially loaded rooms.
- `updated` → Fired when there is a new message in any of the rooms that belong to the inbox, including those not yet loaded. The attached listeners are called with the updated list of rooms.


## See also

- [Rooms](./rooms.md)
- [The Kabelwerk object](./kabelwerk.md)
