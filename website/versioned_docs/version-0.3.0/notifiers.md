# Notifiers

A notifier is an object that emits events intended to be used for implementing client-side notifications — such as [browser notifications](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API). In particular, a notifier object emits an `updated` event whenever there is a new message posted in any of the rooms of the connected user (of course, excluding messages authored by the latter). In case the websocket connection temporarily drops, upon reconnecting the notifier will emit events for the messages missed while the client was disconnected.

Here is an example using the browser notifications API — assuming that the [requesting the necessary permission](https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission) is handled elsewhere:

```js
let notifier = Kabelwerk.openNotifier();

notifier.on('updated', ({ message }) => {
    const message = notification.message;

    new Notification(message.user.name, { body: message.text });
});

notifier.connect();
```

Message objects are of the same type as the [message objects used with rooms](./rooms.md#messaging).

## List of methods

-   **`notifier.connect()`** → Establishes connection to the server. Usually all event listeners should be already attached when this method is invoked.
-   **`notifier.disconnect()`** → Removes all previously attached event listeners and closes the connection to the server.
-   **`notifier.off(event, ref)`** → Removes one or more previously attached event listeners. Both parameters are optional: if no `ref` is given, all listeners for the given `event` are removed; if no `event` is given, then all event listeners attached to the inbox object are removed.
-   **`notifier.on(event, listener)`** → Attaches an event listener. See [next section](#list-of-events) for a list of available events. Returns a short string identifying the attached listener — which string can be then used to remove that event listener via the `notifier.off(event, ref)` method.
-   **`notifier.once(event, listener)`** → The same as the `notifier.on(event, listener)` method, except that the listener will be automatically removed after being invoked — i.e. the listener is invoked at most once.

## List of events

-   **`error`** → Fired when there is a problem establishing connection to the server (e.g. because of a timeout). The attached listeners are called with an extended Error instance.
-   **`ready`** → Fired at most once, when the connection to the server is first established. The attached listeners are called with a `{messages}` object containing a list of messages not yet marked by the connected user. You may wish to use this event to show a (potentially large) number of notifications to the user upon opening the client.
-   **`updated`** → Fired when there is a new message posted in any of the rooms that the connected user has access to. Also, if the websocket connection drops, fired upon reconnecting for each message posted while the websocket was disconnected. The attached listeners are called with an `{message}` object.

## See also

-   [Inboxes](./inboxes.md)
-   [The Kabelwerk object](./kabelwerk.md)
