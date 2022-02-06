# Inboxes

An inbox is a view on the [rooms](./rooms.md) the user has access to; it maintains a list of rooms ordered by recency of their latest message.

```js
let inbox = Kabelwerk.openInbox();

inbox.on('ready', ({ items }) => {
    // this event is fired once when the initial list of inbox items is loaded
});

inbox.on('updated', ({ items }) => {
    // whenever a new message is posted, the list of inbox items is updated
    // accordingly and this event is fired
});

// bring it to life, preferably after attaching the desired event listeners
inbox.connect();

inbox
    .loadMore()
    .then(({ items }) => {
        // resolves into the expanded list of inbox items
    })
    .catch((error) => {
        // if there are no more items, you will get an empty list, not an error
    });
```

An inbox item is an object with the following fields:

-   `room`: an object containing some of the attributes of the respective chat room:
    -   `hubId`: the ID of the hub to which the room belongs;
    -   `id`: an integer;
-   `message`: the latest message posted in this room; either a [message object](./rooms.md#messaging) or `null` if the room is empty;
-   `isNew`: a boolean; `true` if the room contains at least one message which is new to the connected user and `false` otherwise; determining whether a message is new relies on the connected user's room [marker](./rooms.md#markers) — so if you do not move markers the value will always be `true` unless the latest message posted in the room is authored by the user.

Please note that inbox items just hold data; in order to send and receive messages in the chat rooms, you have to explicitly [init room objects](./rooms.md).

Each end user has one room per hub; so if your care team is organised in a single hub, an end user's inbox will contain (at most) one room. On the other hand, each hub user has access to all rooms belonging to their hub and would often need multiple inboxes to better organise their work.

## On the hub side

Inbox objects provide some additional functionality if the connected user is a hub user. First, the inbox items' room objects have a few more fields in addition to those listed above:

-   `archived`: a boolean indicating whether the room is currently archived;
-   `assignedTo`: the ID of the hub user who is assigned to the room, or `null` if nobody is assigned;
-   `attributes`: the room's custom attributes (set by `room.setAttributes`);
-   `user`: the user to whom the room belongs, as an `{ id, key, name }` object.

The first three of these can be used to specify a filter when initing an inbox object:

```js
const params = {
    // select only archived rooms
    archived: true,

    // select only rooms assigned to the connected user
    assignedTo: Kabelwerk.getUser().id,

    // select only unassigned rooms
    assignedTo: null,

    // select only rooms with the specified attributes
    // (attributes are usually set on the end user side)
    attributes: {
        country: 'DE',
    },
};

let inbox = Kabelwerk.openInbox(params);

inbox.on('ready', ({ items }) => {
    // all rooms are archived, unassigned, and belong to users from Germany
});

inbox.on('updated', ({ items }) => {
    // only fired for inbox items the rooms of which meet the criteria set by
    // the params
});

inbox.connect();
```

### Search

Inbox items can be searched for by the key and/or name of the room's user. This enables care team members to find the chat room of a particular end user:

```js
inbox
    .search({
        // the needle to search for in the haystack of user keys and names
        query: 'lepricon gold',

        // optional params if you want to implement results pagination
        // these here are the default values
        limit: 10,
        offset: 0,
    })
    .then(({ items }) => {
        // a list of inbox items
        // the list will be empty if the search yielded no results
    })
    .catch((error) => {
        // e.g. if the server times out
    });
```

For the time being, the search functionality is not very sophisticated: the search is just a case-insensitive prefix search, there is no built-in throttling, and you have to take care of pagination by using the `limit` and `offset` params.

## List of methods

-   **`inbox.connect()`** → Establishes connection to the server. Usually all event listeners should be already attached when this method is invoked.
-   **`inbox.disconnect()`** → Removes all previously attached event listeners and closes the connection to the server.
-   **`inbox.listItems()`** → Returns the list of inbox items already loaded by the inbox. The list is sorted by the rooms' latest messages (the room with the most recent message comes first).
-   **`inbox.loadMore()`** → Loads more items. Returns a Promise which resolves into a `{items}` object containing the updated list of inbox items.
-   **`inbox.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the inbox object are removed.
-   **`inbox.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `inbox.off(event, ref)` method.
-   **`inbox.once(event, listener)`** → The same as the `inbox.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.
-   **`inbox.search(params)`** → Performs a server-side search by user key and/or name of the rooms in the inbox. Expects an object that contains at least a `query` string, and optionally a `limit` and an `offset` for results pagination. Returns a Promise which resolves into a `{items}` object containing a (possibly empty) list of inbox items that match the search query. This method is only available on the hub side.

## List of events

-   `error` → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   `ready` → Fired at most once, when the connection to the server is first established. The attached listeners are called with an `{items}` object containing the list of initially loaded inbox items.
-   `updated` → Fired when any of the inbox items changes. An inbox update is triggered by a new message posted in any of the rooms (including rooms not yet loaded); on the hub side it is also triggered by moving rooms between inboxes. Also, if the websocket connection drops, the event is fired upon reconnect if any update occurred while the websocket was disconnected. The attached listeners are called with an `{items}` object containing the updated (and re-ordered) list of inbox items.

## See also

-   [Rooms](./rooms.md)
-   [Notifiers](./notifiers.md)
-   [The Kabelwerk object](./kabelwerk.md)
