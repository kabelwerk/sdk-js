# Rooms

A room is where chat [messages](./messages.md) are exchanged between an end user on one side and your care team (hub users) on the other side.

To initialise a room object, you need the room's ID (usually you would obtain it from an [inbox](./inboxes.md)):

```js
let room = Kabelwerk.openRoom(roomId);

room.on('ready', ({ messages, markers }) => {
    // this event is fired once when the room is loaded
});

// make it live
room.connect();
```

If the room does not exist yet, it has to be explicitly created (usually by the client of the end user) before the room object can be initialised:

```js
Kabelwerk.createRoom(hubIdOrSlug)
    .then(({ id }) => {
        let room = Kabelwerk.openRoom(id);
        room.connect();
    })
    .catch((error) => {
        // e.g. if there already exists a room for this user and hub
    });
```

## Messaging

A chat room mainly consists of a chronologically ordered list of [messages](./messages.md).

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

## Markers

A user in a non-empty chat room may also have a marker marking the message last seen by them. A marker's position is expected to be updated by the client (e.g. whenever the user opens a chat room with unseen messages); the position is also updated automatically whenever the user posts a new message in the chat room. A marker object has the following fields:

-   `messageId`: the ID of the message which is being marked;
-   `updatedAt`: a [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) instance of when the marker was last moved;
-   `userId`: the ID of the user who moved the marker.

A user has access to up to 2 markers in a chat room: for an end user these are their own marker and the latest hub-side marker; for a hub user these are their own marker and the marker of the room's end user.

```js
// either pair item (including both of them) may be null
const [ownMarker, otherMarker] = room.getMarkers();

// use this method to move the connected user's marker to a different message
// specifying the message ID is optional: by default the marker will be moved
// to the last message in the room the client is aware of
room.moveMarker(messageId)
    .then((marker) => {
        // if the user does not yet have a marker in the room, it gets created
    })
    .catch((error) => {
        // e.g. if the server times out
    });

// this event is fired every time a marker in the room is moved,
// including after a message_posted event
room.on('marker_moved', (marker) => {});
```

Using the markers feature is optional: if you choose not to update a user's markers, then you cannot take advantage of the `isNew` flag of [inbox items](./inboxes.md) — the flag will always be set to `true` unless the last message in the respective chat room is posted by the user (markers will still be updated automatically with posted messages) — but no other functionality depends on it.

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
-   **`room.getHubUser()`** → Returns the hub user who is assigned to this room, as an `{ id, key, name }` object. Returns `null` if there is no hub user assigned to this room. This method is only available on the hub side.
-   **`room.getMarkers()`** → Returns the room's pair of markers; the first item of the pair is the connected user's marker and the second item — either the latest hub-side marker or the end user's marker, depending on whether the connected user is an end user or a hub user, respectively. Each pair item is either a `{ messageId, updatedAt, userId }` object or `null` if the respective marker does not exist.
-   **`room.getUser()`** → Returns the room's user, as an `{ id, key, name }` object.
-   **`room.isArchived()`** → Returns a boolean indicating whether the room is marked as archived. This method is only available on the hub side.
-   **`room.loadEarlier()`** → Loads more messages from earlier in the chat history. A room object keeps track of the earliest message it has processed, so this method would usually just work when loading a chat room's history. Returns a Promise which resolves into a `{ messages }` object.
-   **`room.moveMarker(messageId)`** → Moves the connected user's marker in the room, creating it if it does not exist yet. If provided, the optional parameter should be the ID of the message to which to move the marker; the default value is the ID of the last message in the room that the client is aware of. Returns a Promise which resolves into the updated marker object.
-   **`room.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the room object are removed.
-   **`room.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `room.off(event, ref)` method.
-   **`room.once(event, listener)`** → The same as the `room.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.
-   **`room.postMessage(params)`** → Posts a new message in the chat room. The parameter should be either a `{ text }` object if you want to create a text message or an `{ uploadId }` object if you want to create an image message. Returns a Promise which resolves into the newly added message.
-   **`room.postUpload(file)`** → Uploads a file in the chat room. The parameter is expected to be a [File](https://developer.mozilla.org/en-US/docs/Web/API/File) object or a platform-specific equivalent (e.g. an object with an `uri` attribute in the case of React Native). Returns a Promise which resolves into an [upload object](./uploads.md) (the ID of which can be then used to post an image message).
-   **`room.unarchive()`** → Marks the room as not archived. Returns a Promise. This method is only available on the hub side.
-   **`room.updateAttributes(attributes)`** → Sets the room's custom attributes. Returns a Promise.
-   **`room.updateHubUser(hubUserId)`** → Sets the hub user assigned to this room. The parameter should be either the hub user's ID or `null` when un-assigning a room. Returns a Promise. This method is only available on the hub side.

## List of events

-   **`error`** → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   **`ready`** → Fired at most once, when the connection to the server is first established. The attached listeners are called with an object containing (1) a list of the room's most recent messages, and (2) the list of the room's markers.
-   **`message_posted`** → Fired when there is a new message posted in the room. If the websocket connection drops, fired upon reconnecting for each message posted while the websocket was disconnected. The attached listeners are called with the newly added message.
-   **`marker_moved`** → Fired when a marker in the room is updated (or created). If the websocket connection drops, fired upon reconnecting for each marker moved while the websocket was disconnected. The attached listeners are called with the updated marker object.

## See also

-   [Messages](./messages.md)
-   [Uploads](./uploads.md)
