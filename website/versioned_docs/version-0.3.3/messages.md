# Messages

A chat message object has the following fields:

-   **`html`** → The content of the message in HTML format — wrapped in `<p>` tags, with newlines within paragraphs converted to `<br>` tags, and with [markdown](#markdown) syntax already processed. HTML special characters in the original user input are escaped. You should use this field when rendering chat room messages.
-   **`id`** → The message's unique integer ID.
-   **`insertedAt`** → Server-side timestamp of when the message was first stored in the database. The value is a standard [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object.
-   **`roomId`** → The ID of the [room](./rooms.md) to which the message belongs.
-   **`text`** → The content of the message in plaintext format — the original user input with HTML entities escaped. You may want to use this field when rendering inbox items or notifications.
-   **`type`** → The type of the message — either `text`, `image`, or `room_move`, with the latter only available [on the hub side](./rooms.md#on-the-hub-side).
-   **`updatedAt`** → Server-side timestamp of when the message was last modified. If the message has not been edited, this will be the same as the `insertedAt` timestamp. The value is a standard [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object.
-   **`upload`** → Either `null` or an [upload object](./uploads.md) if the message is of type `image`.
-   **`user`** → The user who posted the message, as an `{ id, key, name }` object.

## Markdown

The following markdown syntax can be used in messages:

| User input                                | HTML output                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| <em>`*single asterisks*`</em>             | `<em>single asterisks</em>`                                               |
| <em>`_single underscores_`</em>           | `<em>single underscores</em>`                                             |
| <strong>`**double asterisks**`</strong>   | `<strong>double asterisks</strong>`                                       |
| <strong>`__double underscores__`</strong> | `<strong>double underscores</strong>`                                     |
| `[link](https://kabelwerk.io)`            | `<a href="https://kabelwerk.io" target="_blank">link</a>`                 |
| `https://kabelwerk.io`                    | `<a href="https://kabelwerk.io" target="_blank">https://kabelwerk.io</a>` |

## See also

-   [Uploads](./uploads.md)
-   [Rooms](./rooms.md)
