# Changelog

## 0.3.4 (TBA)

-   Kabelwerk object: new method `updateDevice()` for storing and updating push notifications settings for the currently connected device ([docs](./docs/kabelwerk.md#list-of-methods)).
-   Upgraded Phoenix to [1.6.13](https://hexdocs.pm/phoenix/1.6.13/js/).

## 0.3.3 (2022-08-11)

-   New chat message type: `image` ([docs](./docs/messages.md)).
-   Chat messages have a new field: `upload` ([docs](./docs/messages.md)).
-   Rooms: new method `postUpload(file)` ([docs](./docs/rooms.md#list-of-methods)).
-   Rooms: `postMessage` can now post image messages ([docs](./docs/rooms.md#list-of-methods)).

## 0.3.2 (2022-07-03)

-   Chat message objects have a new `html` field ([docs](./docs/messages.md)).
-   Kabelwerk object: `ConnectionError` instances now have a `cause` property.
-   Upgraded Phoenix to [1.6.10](https://hexdocs.pm/phoenix/1.6.10/js/).
-   Kabelwerk object: new method `ping()` for pinging the server ([docs](./docs/kabelwerk.md#list-of-methods)).

## 0.3.1 (2022-04-30)

-   Kabelwerk object: `openRoom()` now could be called without a parameter as well ([docs](./docs/kabelwerk.md#list-of-methods)).
-   Rooms: fixed the response of `loadEarlier()` when called on an empty room.

## 0.3.0 (2022-04-21)

-   Kabelwerk object: new method `getState()` for checking the current [connection state](./docs/connection-states.md) ([docs](./docs/kabelwerk.md#list-of-methods)).
-   Kabelwerk object: removed the `isConnected()` method; please use the new `getState()` method instead (see above).
-   Kabelwerk object: removed the `reconnected` event; please use the `connected` event instead ([docs](./docs/kabelwerk.md#list-of-events)).
-   Kabelwerk object: the `token` config option is no longer required; when not provided, the function supplied to the `refreshToken` config option will be used to obtain an initial auth token ([docs](./docs/kabelwerk.md#config)).
-   Kabelwerk object: added the `ensureRooms` config option ([docs](./docs/kabelwerk.md#config)).
-   Upgraded Phoenix to [1.6.7](https://hexdocs.pm/phoenix/1.6.7/js/).

## 0.2.2 (2022-02-10)

-   Rooms: fixed `updateHubUser` to accept `null` ([docs](./docs/rooms.md#on-the-hub-side)).
-   Rooms: providing a `messageId` to `moveMarker` is now optional; the default value is the ID of the last message in the room the client is aware of ([docs](./docs/rooms.md#markers)).
-   Kabelwerk object: `createRoom` can now also accept a hub's slug (previously it could only work a hub's ID) as a parameter ([docs](./docs/kabelwerk.md#rooms)).

## 0.2.1 (2022-01-29)

-   New feature: notifiers ([docs](./docs/notifiers.md)).
-   Rooms: enabled access to the other side's marker ([docs](./docs/rooms.md#markers)).
-   Upgraded Phoenix to [1.6.6](https://hexdocs.pm/phoenix/1.6.6/js/).

## 0.2.0 (2021-11-19)

-   Change in the API: inboxes now contain items instead of rooms ([docs](./docs/inboxes.md)).
-   New feature: inbox search ([docs](./docs/inboxes.md#search)).
-   New feature: markers ([docs](./docs/rooms.md#markers)).

## 0.1.7 (2021-10-21)

-   Inboxes: updates missed while disconnected are emitted when reconnected.
-   Parameter validation for most SDK methods.

## 0.1.6 (2021-10-17)

-   Chat message objects have a new `type` field, for now only relevant on the hub side ([docs](./docs/rooms.md#messaging)).
-   Inboxes: rooms are automatically removed when they cease to match the filters (only relevant on the hub side).
-   Upgraded Phoenix to [1.5.13](https://hexdocs.pm/phoenix/1.5.13/js/).

## 0.1.5 (2021-10-15)

-   New event emitted by the `Kabelwerk` object: `reconnected` ([docs](./docs/kabelwerk.md)).
-   All `.disconnect()` methods now implicitly call `.off()`.
-   Rooms: `loadAttributes()` → `getAttributes()` ([docs](./docs/rooms.md#custom-attributes)).
-   Rooms: new method `getUser()` for retrieving the room's user.
-   Rooms: implemented methods for checking and updating the room's archive status ([docs](./docs/rooms.md#on-the-hub-side)).
-   Rooms: changed the methods for retrieving and updating the hub user assigned to the room ([docs](./docs/rooms.md#on-the-hub-side)).
-   Upgraded Phoenix to [1.5.12](https://hexdocs.pm/phoenix/1.5.12/js/).

## 0.1.4 (2021-07-30)

-   Changed the API: a new `Kabelwerk` object.

## 0.1.3 (2021-07-24)

-   Fixed the issue where inboxes get broken by rooms without messages.
-   Updated some callback payloads and promise resolves as per the docs.

## 0.1.2 (2021-07-10)

-   More functionality.
-   More docs.

## 0.1.1 (2021-06-29)

-   Fixed the [Phoenix](https://www.npmjs.com/package/phoenix) import.

## 0.1.0 (2021-06-06)

-   First operational release.
