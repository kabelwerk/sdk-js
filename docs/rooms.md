# Rooms

A room is where chat messages are exchanged between an end user on one side and your care team (hub users) on the other side.

To initialise a room object, you need the room's ID (usually you would obtain it from an [inbox](./inboxes.md)):

```js
let room = Kabelwerk.openRoom(roomId);

room.on('ready', ({ messages, marker }) => {
    // this event is fired once when the room is loaded
});

// make it live
room.connect();
```

If the room does not exist yet, it has to be explicitly created (usually by the client of the end user) before the room object can be initialised:

```js
Kabelwerk.createRoom(hubId)
    .then(({ id }) => {
        let room = Kabelwerk.openRoom(id);
        room.connect();
    })
    .catch((error) => {
        // e.g. if there already exists a room for this user and hub
    });
```

## Messaging

A chat room mainly consists of a chronologically ordered list of messages.

```js
room.on('message_posted', (message) => {
    // this event is fired every time a new message is posted in this room
});

room.postMessage({ text })
    .then((message) => {
        // you will also get the same message via the message_posted event
    })
    .catch((error) => {
        // e.g. if the given text is an empty string
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

A message object has the following fields:

-   `id`: an integer;
-   `insertedAt`: a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) instance of when the message was created in the database;
-   `roomId`: the ID of the room to which the message belongs;
-   `text`: the content of the message;
-   `type`: the type of the message — either `text` or `room_move`, with the latter only available on the hub side.
-   `updatedAt`: for the time being the same as `insertedAt`;
-   `user`: the user who posted the message, as an `{ id, key, name }` object.

## Markers

A chat room may optionally have a marker marking the last message seen by the user (or at least by the user's client). If set, a marker object has the following fields:

-   `messageId`: the ID of the message which is being marked;
-   `updatedAt`: a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) instance of when the marker was last moved.

If a room does not have a marker yet, then the ready event will be emitted with its `marker` field set to `null` instead.

```js
// returns null if the room does not have a marker yet
room.getMarker();

// use this method to move the marker to a different message
room.moveMarker(messageId)
    .then((marker) => {
        // if the room does not have a marker, it gets created
    })
    .catch((error) => {
        // e.g. if the server times out
    });

// this event is fired every time the room's marker is updated
room.on('marker_moved', (marker) => {
    console.assert(marker.messageId == room.getMarker().messageId);
});
```

Using this feature is optional. However, without markers you cannot take advantage of the `isNew` flag of [inbox items](./inboxes.md) as this will always be set to `true`.

## Custom attributes

Rooms can optionally have custom attributes. These are usually set on the end side and then used on the hub side to provide additional information to the care team about the room's user.

```js
// use this method to inspect the room's custom attributes
let attributes = room.getAttributes();

// the returned object is just a local copy
attributes.country = 'DE';

// use this method to set/update the custom attributes
room.updateAttributes(attributes)
    .then((attributes) => {
        // the resolved value will be identical as room.getAttributes() here
        console.assert(attributes.country == 'DE');
        console.assert(room.getAttributes().country == 'DE');
    })
    .catch((error) => {
        // e.g. if the server times out
    });
```

## On the hub side

Room objects provide some additional functionality if the connected user is a hub user:

```js
// rooms can be archived
room.archive()
    .then(() => {
        // the room is now marked as archived
        console.assert(room.isArchived() == true);

        // now let us move it back out of the archive
        return room.unarchive();
    })
    .then(() => {
        // the room is now not marked as archived
        console.assert(room.isArchived() == false);
    })
    .catch((error) => {
        // e.g. if the server times out
    });

// rooms can be assigned to a specific care team member
room.updateHubUser(Kabelwerk.getUser().id)
    .then(() => {
        // the room is now assigned to the connected user
        console.assert(room.getHubUser().id == Kabelwerk.getUser().id);

        // let us revert
        return room.updateHubUser(null);
    })
    .then(() => {
        // the room is now not assigned to anyone
        console.assert(room.getHubUser() == null);
    })
    .catch((error) => {
        // e.g. if the connected user is not a hub user
    });
```

## List of methods

-   **`room.archive(until)`** → Marks the room as archived. If the optional parameter `until` is specified (it should be a Date object), the room will be automatically un-archived at that point in time; the default value is `null`, meaning that the room will not automatically move out of the archive. Returns a Promise. This method is only available on the hub side.
-   **`room.connect()`** → Establishes connection to the server. Usually all event listeners should be already attached when this method is invoked.
-   **`room.disconnect()`** → Removes all previously attached event listeners and closes the connection to the server.
-   **`room.getAttributes()`** → Returns the room's custom attributes.
-   **`room.getHubUser()`** → Returns the hub user who is assigned to this room, as an `{id, key, name}` object. Returns `null` if there is no hub user assigned to this room. This method is only available on the hub side.
-   **`room.getMarker()`** → Returns the room's marker, as an `{messageId, updatedAt}` object. Returns `null` if the room does not have a marker yet.
-   **`room.getUser()`** → Returns the room's user, as an `{id, key, name}` object.
-   **`room.isArchived()`** → Returns a boolean indicating whether the room is marked as archived. This method is only available on the hub side.
-   **`room.loadEarlier()`** → Loads more messages from earlier in the chat history. A room object keeps track of the earliest message it has processed, so this method would usually just work when loading a chat room's history. Returns a Promise which resolves into a `{messages}` object.
-   **`room.moveMarker(messageId)`** → Moves the room's marker, creating it if it does not exist yet. The parameter should be the ID of the message to which to move the marker. Returns a Promise which resolves into the updated marker object.
-   **`room.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the room object are removed.
-   **`room.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `room.off(event, ref)` method.
-   **`room.once(event, listener)`** → The same as the `room.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.
-   **`room.postMessage(message)`** → Posts a new message in the chat room. The parameter should be a `{text}` object. Returns a Promise which resolves into the newly added message.
-   **`room.unarchive()`** → Marks the room as not archived. Returns a Promise. This method is only available on the hub side.
-   **`room.updateAttributes(attributes)`** → Sets the room's custom attributes. Returns a Promise.
-   **`room.updateHubUser(hubUserId)`** → Sets the hub user assigned to this room. The parameter should be either the hub user's ID or `null` when un-assigning a room. Returns a Promise. This method is only available on the hub side.

## List of events

-   `error` → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   `ready` → Fired at most once, when the connection to the server is first established. The attached listeners are called with an object containing (1) a list of the chat room's most recent messages, and (2) the chat room's marker.
-   `message_posted` → Fired when there is a new message posted in the room. The attached listeners are called with the newly added message.
-   `marker_moved` → Fired when the room's marker is updated (or created). The attached listeners are called with the updated marker object.

## See also

-   [Inboxes](./inboxes.md)
-   [The Kabelwerk object](./kabelwerk.md)
