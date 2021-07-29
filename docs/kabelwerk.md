# Kabelwerk

The `Kabelwerk` object is a singleton that opens and maintains the websocket connection to the Kabelwerk backend. It is also used for retrieving and updating the connected user's info, opening [inboxes](./inboxes.md), and creating and opening [rooms](./rooms.md).

```js
import Kabelwerk from 'kabelwerk';

Kabelwerk.config({
    url: 'wss://hub.kabelwerk.io/socket/user',
    token: 'signed.jwt.token',
    refreshToken: async (token) => token,
    logging: 'info',
});

Kabelwerk.on('ready', () => {
    // this event is fired once, when the initial connection is established
});

Kabelwerk.on('error', (error) => {
    // e.g. when the token is invalid
});

Kabelwerk.on('connected', () => {
    // this event is fired every time the connection is (re-)established
});

Kabelwerk.on('disconnected', () => {
    // this event is fired every time the connection drops
});

Kabelwerk.connect();
```


## Config

- `url`: the URL of the Kabelwerk backend to connect to;
- `token`: a JWT token identifying the user on behalf of whom the connection is established;
- `refreshToken`: a function that should take as argument the current token and should return a promise resolving into the new token (or the same token, if no refresh is needed); the default is `null`, which means that the same token is going to be used for reconnection;
- `logging`: one of the (case-insensitive) strings `info`, `error`, `silent` (the default).

The `Kabelwerk.config()` method can be called mutliple times; also, only the given keys are updated.


## User

```js
let user = Kabelwerk.getUser();
user.name = 'Nana';

Kabelwerk.updateUser(user).then((user) => {
    console.assert(user.name == 'Nana');
    console.assert(kabel.getUser().name == 'Nana');
}).catch((error) => {
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
Kabelwerk.createRoom(hubId).then(({ id }) => {
    let room = Kabelwerk.openRoom(id);
});

// if you already have the room's id
let room = Kabelwerk.openRoom(roomId);
```

See the [rooms](./rooms.md) page.


## On the hub side

The `Kabelwerk` object provides some additional functionality if the connected user is a hub user:

```js
Kabelwerk.loadHubInfo().then(() => {
    // { id, name, users }
}).catch((error) => {
    // e.g. if the connected user is not a hub user
});
```
