# Kabel

The kabel object opens and maintains the websocket connection to the Kabelwerk backend. You need it for retrieving and updating the connected user's info, opening [inboxes](./inboxes.md), and creating and opening [rooms](./rooms.md).

```js
import Kabelwerk from 'kabelwerk';

let kabel = Kabelwerk.connect({ url, token });

kabel.on('ready', () => {
    // this event is fired once when the intiial connection is established
});

kabel.on('error', (error) => {
    // e.g. when the token is invalid
});

kabel.on('connected', () => {
    // this event is fired every time the connection is (re-)established
});

kabel.on('disconnected', () => {
    // this event is fired every time the connection drops
});
```


## User

```js
let user = kabel.getUser();
user.name = 'Nana';

kabel.updateUser(user).then((user) => {
    console.assert(user.name == 'Nana');
    console.assert(kabel.getUser().name == 'Nana');
}).catch((error) => {
    // e.g. if the server times out
});
```


## Inboxes

```js
let inbox = kabel.openInbox();
```

See the [inboxes](./inboxes.md) page.


## Rooms

```js
// to create a new room for the connected user in the given hub
kabel.createRoom(hubId).then(({ id }) => {
    let room = kabel.openRoom(id);
});

// if you already have the room's id
let room = kabel.openRoom(roomId);
```

See the [rooms](./rooms.md) page.


## On the hub side

```js
kabel.loadHubInfo().then(() => {
    // {id, name, users}
}).catch((error) => {
    // e.g. if the connected user is not a hub user
});
```
