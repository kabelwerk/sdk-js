# The Kabelwerk object

The Kabelwerk object is a singleton that opens and maintains the websocket connection to the Kabelwerk backend. It is also used for retrieving and updating the connected user's info, opening [inboxes](./inboxes.md), and creating and opening [rooms](./rooms.md).

```js
import Kabelwerk from 'kabelwerk';

Kabelwerk.config({
    url: 'wss://hub.kabelwerk.io/socket/user',
    token: 'signed.jwt.token',
    refreshToken: async (token) => token,
    logging: 'info',
});

Kabelwerk.on('ready', () => {
    // this event is fired once: when the initial connection is established and
    // the other methods are ready to be used (openInbox, openRoom, etc.)
});

Kabelwerk.on('error', (error) => {
    // e.g. if the token is invalid
});

Kabelwerk.on('disconnected', () => {
    // this event is fired every time when the connection drops
});

Kabelwerk.on('connected', () => {
    // this event is fired every time when the connection is automatically
    // re-established after a disconnect
});

Kabelwerk.connect();
```

## Config

-   **`url`** → The URL of the Kabelwerk backend to connect to.
-   **`token`** → A [JWT](https://datatracker.ietf.org/doc/html/rfc7519) token which (1) is signed by an RSA key the public counterpart of which is known to the Kabelwerk backend you are connecting to; (2) includes a `sub` claim identifying the user on behalf of whom the connection is established; and (3) includes a valid `exp` claim. The value of the `sub` claim is stored on the Kabelwerk backend as the respective user's key.
-   **`refreshToken`** → If this setting is provided, it must be a function that takes as argument the current authentication token and returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolving into a new authentication token (or the same token, if no refresh is needed). If you only provide a `token`, this will be used both for the initial connection and then again each time when reconnecting; if you only provide a `refreshToken` function, this will be called without an argument to obtain the initial connection token, and then with the last token when reconnecting; if you provide both a `token` and a `refreshToken` function, then the former will be used for the initial connection, and the latter when reconnecting.
-   **`ensureRooms`** → If this setting is provided, Kabelwerk will make sure that the connected user has a room on each of the specified hubs. The value could be either a list of hub slugs or the string `'all'` — in which case a room is created for the user on every hub. If Kabelwerk fails to ensure that the rooms are created (e.g. if there does not exists a hub with one of the given slugs), an `error` event is emitted and the connection is terminated. This setting is only applicable for end users.
-   **`logging`** → One of the (case-insensitive) strings `'debug'`, `'info'`, `'error'`, or `'silent'`. The last one is the default value, meaning that no logs will be written unless this setting is explicitly provided.

The `Kabelwerk.config()` method can be called mutliple times; also, only the given keys are updated.

## User

```js
let user = Kabelwerk.getUser();
user.name = 'Nana';

Kabelwerk.updateUser(user)
    .then((user) => {
        console.assert(user.name == 'Nana');
        console.assert(kabel.getUser().name == 'Nana');
    })
    .catch((error) => {
        // e.g. if the server times out
    });
```

## Inboxes

```js
let inbox = Kabelwerk.openInbox();
```

See the [inboxes](./inboxes.md) page.

## Rooms

```js
// to create a new room for the connected user in the given hub
Kabelwerk.createRoom(hubIdOrSlug).then(({ id }) => {
    let room = Kabelwerk.openRoom(id);
});

// if you already have the room's id
let room = Kabelwerk.openRoom(roomId);
```

See the [rooms](./rooms.md) page.

## On the hub side

The `Kabelwerk` object provides some additional functionality if the connected user is a hub user:

```js
Kabelwerk.loadHubInfo()
    .then(() => {
        // { id, name, users }
    })
    .catch((error) => {
        // e.g. if the connected user is not a hub user
    });
```

## List of constants

-   **`Kabelwerk.CONNECTING`** → A [connection state](./connection-states.md) constant.
-   **`Kabelwerk.INACTIVE`** → A [connection state](./connection-states.md) constant.
-   **`Kabelwerk.ONLINE`** → A [connection state](./connection-states.md) constant.
-   **`Kabelwerk.VERSION`** → The SDK's version, as a `major.minor.patch` string.

## List of methods

-   **`Kabelwerk.config(opts)`** → Sets the [configuration](#config). This method should be called at least once before invoking `Kabelwerk.connect()` in order to set an authentication token.
-   **`Kabelwerk.connect()`** → Establishes connection to the server. Usually all event listeners should be already attached when this method is invoked.
-   **`Kabelwerk.createRoom(hubIdOrSlug)`** → Creates a chat room between the connected user and a hub. Returns a Promise resolving into an `{id}` object holding the ID of the newly created room. This method is intended to be used on the end side.
-   **`Kabelwerk.disconnect()`** → Removes all previously attached event listeners and closes the connection to the server.
-   **`Kabelwerk.getState()`** → Returns the current [connection state](./connection-states.md).
-   **`Kabelwerk.getUser()`** → Returns the connected user, as an `{id, key, name}` object.
-   **`Kabelwerk.loadHubInfo()`** → Loads info about the connected user's hub. Returns a Promise resolving info an `{id, name, users}` object. This method is only available on the hub side.
-   **`Kabelwerk.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the Kabelwerk object are removed.
-   **`Kabelwerk.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `Kabelwerk.off(event, ref)` method.
-   **`Kabelwerk.once(event, listener)`** → The same as the `Kabelwerk.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.
-   **`Kabelwerk.openInbox(params)`** → Initialises and returns an [inbox object](./inboxes.md) with the given parameters.
-   **`Kabelwerk.openNotifier()`** → Initialises and returns a [notifier object](./notifiers.md).
-   **`Kabelwerk.openRoom(roomId)`** → Initialises and returns a [room object](./rooms.md) for the chat room with the given ID. Alternatively, the method can be called without a parameter, in which case one of the rooms belonging to the connected user will be opened — useful when you have a single hub.
-   **`Kabelwerk.updateUser(attributes)`** → Updates the connected user's name. Expects a `{name}` object and returns a Promise.

## List of events

-   **`error`** → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   **`ready`** → Fired when the connection to the server is first established and the Kabelwerk object is ready to be used. The attached event listeners are called with a `{user}` object containing info about the connected user.
-   **`connected`** → Fired when the connection to the server is established. This could be either because `Kabelwerk.connect()` was invoked, or it could be due to automatically re-establishing the connection after a connection drop. In the former case, the Kabelwerk object may not yet be ready to be used as it may still have to fetch some data from the server (such as the connected user's info). Useful for displaying the connection's status to the user.
-   **`disconnected`** → Fired when the connection to the server is dropped. Useful for displaying the connection's status to the user.
-   **`user_updated`** → Fired when the connected user's attributes are changed. The attached listeners are called with the up-to-date `{id, key, name}` object.

## See also

-   [Connection states](./connection-states.md)
-   [Inboxes](./inboxes.md)
-   [Rooms](./rooms.md)
-   [Notifiers](./notifiers.md)
