# Notifiers

A notifier is an object that emits events intended to be used for implementing client-side notifications — such as [browser notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API). In particular, a notifier object emits an `updated` event whenever there is a new message posted in any of the rooms of the connected user (of course, excluding messages authored by the latter). In case the websocket connection temporarily drops, upon reconnecting the notifier will emit events for the messages missed while the client was disconnected.

Here is an example using the browser notifications API — assuming that the [requesting the necessary permission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission) is handled elsewhere:

```js
let notifier = Kabelwerk.openNotifier();

notifier.on('updated', ({ notification }) => {
    const message = notification.message;

    new Notification(message.user.name, { body: message.text });
});

notifier.connect();
```

## List of events

-   `error` → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   `ready` → Fired at most once, when the connection to the server is first established.
-   `updated` → Fired when there is a new message posted in any of the rooms that the connected user has access to. Also, if the websocket connection drops, fired upon reconnecting for each message posted while the websocket was disconnected. The attached listeners are called with an `{notification}` object.

## See also

-   [Inboxes](./inboxes.md)
-   [The Kabelwerk object](./kabelwerk.md)
