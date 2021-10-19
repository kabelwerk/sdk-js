# Changelog

## 0.1.7 (TBD)

-   Inboxes: updates missed while disconnected are emitted when reconnected.

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
