# Configuration

## Example

```js
Kabelwerk.config({
    url: 'wss://hub.kabelwerk.io/socket/user',
    token: 'initial.jwt.token',
    refreshToken: () => fetchKabelwerkToken().then((res) => res.data.token),
    ensureRooms: 'all',
    logging: 'info',
});

// the method can be called multiple times — each call only updates the values
// for the given keys
Kabelwerk.config({ logging: 'silent' });
```

## Reference

### `url`

The URL of the Kabelwerk backend to connect to.

### `token`

A [JWT](https://datatracker.ietf.org/doc/html/rfc7519) token which:

-   is signed by an RSA key the public counterpart of which is known to the Kabelwerk backend you are connecting to;
-   includes a `sub` claim identifying the user on behalf of whom the connection is established;
-   includes a valid `exp` claim.

The value of the `sub` claim is stored on the Kabelwerk backend as the respective user's key.

### `refreshToken`

If this setting is provided, it must be a function that takes as argument the current authentication token and returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) resolving into a new authentication token (or perhaps the same token if no refresh is needed).

If you provide only a `token`, it will be used both for the initial connection and then again each time when reconnecting. If you provide only a `refreshToken` function, it will be called to obtain the initial connection token, and then it will be called again each time when reconnecting. If you provide both a `token` and a `refreshToken` function, then the former will be used for the initial connection, and the latter each time when reconnecting.

### `ensureRooms`

If this setting is provided, Kabelwerk will make sure that the connected user has a room on each of the specified hubs. The value could be either a list of hub slugs or the string `'all'` — in which case a room is created for the user on every hub. If Kabelwerk fails to ensure that the rooms are created (e.g. if there does not exists a hub with one of the given slugs), an `error` event is emitted and the connection is terminated. This setting is only applicable for end users.

### `logging`

One of the (case-insensitive) strings `'debug'`, `'info'`, `'error'`, or `'silent'`. The last one is the default value, meaning that no logs will be written unless this setting is explicitly provided.

## See also

-   [The Kabelwerk object](./kabelwerk.md)
-   [Rooms](./rooms.md)
