const PayloadFactory = {};

//
// private channels
//

// Generate a response to an update_user push, or a user_updated event.
//
PayloadFactory.user = (function () {
    let counter = 0;
    let timestamp = new Date().getTime();

    return function (params) {
        const id = ++counter;
        const dt = new Date(timestamp + id * 1000);

        return {
            hub_id: null,
            id: id,
            inserted_at: dt.toJSON(),
            key: `key_${id}`,
            name: `user ${id}`,
            updated_at: dt.toJSON(),
        };
    };
})();

// Generate a response to an update_device push.
//
PayloadFactory.device = (function () {
    let counter = 0;

    return function (params = {}) {
        const id = ++counter;
        const dt = new Date();

        return {
            id: id,
            inserted_at: dt.toJSON(),
            push_notifications_enabled:
                'push_notifications_enabled' in params
                    ? params.push_notifications_enabled
                    : false,
            push_notifications_token:
                'push_notifications_token' in params
                    ? params.push_notifications_token
                    : 'TOKEN',
            updated_at: dt.toJSON(),
        };
    };
})();

// Generate a response to joining a private channel.
//
PayloadFactory.privateJoin = function (params = {}) {
    return {
        room_ids: 'room_ids' in params ? params.room_ids : [],
        user: 'user' in params ? params.user : PayloadFactory.user(),
    };
};

//
// inbox channels
//

// Generate an inbox_updated event.
//
PayloadFactory.inboxItem = (function () {
    let counter = 0;

    return function (params = {}) {
        let id = 'id' in params ? params.id : ++counter;

        return {
            room: {
                hub: {
                    id: 1,
                    name: 'Hub',
                    slug: 'hub',
                },
                id: id,
            },
            message:
                'message' in params
                    ? params.message
                    : PayloadFactory.message({ room_id: id }),
            marked_by: 'marked_by' in params ? params.marked_by : [],
        };
    };
})();

// Generate a response to a list_rooms push.
//
PayloadFactory.inbox = function (number, params = {}) {
    let items = [];

    for (let i = 0; i < number; i++) {
        items.push(PayloadFactory.inboxItem(params));
    }

    return { items };
};

// Generate an inbox_updated event as received by a hub user.
//
PayloadFactory.hubInboxItem = (function () {
    let counter = 0;

    return function (params = {}) {
        let id = 'id' in params ? params.id : ++counter;
        let user = 'user' in params ? params.user : PayloadFactory.user();

        return {
            room: {
                archived: 'archived' in params ? params.archived : false,
                attributes: 'attributes' in params ? params.attributes : {},
                hub_id: 1,
                hub_user_id:
                    'hub_user_id' in params ? params.hub_user_id : null,
                id: id,
                user: {
                    id: user.id,
                    key: user.key,
                    name: user.name,
                },
            },
            message:
                'message' in params
                    ? params.message
                    : PayloadFactory.message({ room_id: id }),
            marked_by: 'marked_by' in params ? params.marked_by : [],
        };
    };
})();

// Generate a response to a list_rooms push from a hub user.
//
PayloadFactory.hubInbox = function (number, params = {}) {
    let items = [];

    for (let i = 0; i < number; i++) {
        items.push(PayloadFactory.hubInboxItem(params));
    }

    return { items };
};

//
// room channels
//

// Generate a response to a set_attributes push.
//
PayloadFactory.room = (function () {
    let counter = 0;

    return function (params = {}) {
        let user = 'user' in params ? params.user : PayloadFactory.user();

        return {
            attributes: 'attributes' in params ? params.attributes : {},
            id: 'id' in params ? params.id : ++counter,
            user: {
                id: user.id,
                key: user.key,
                name: user.name,
            },
        };
    };
})();

// Generate a response to a set_inbox_info push.
//
PayloadFactory.hubRoom = function (params = {}) {
    return Object.assign(PayloadFactory.room(params), {
        archived: 'archived' in params ? params.archived : false,
        archived_until:
            'archived_until' in params ? params.archived_until : null,
        hub_user: 'hub_user' in params ? params.hub_user : null,
    });
};

// Generate a response to a post_message push or a message_posted event.
//
PayloadFactory.message = (function () {
    let counter = 0;
    let timestamp = new Date().getTime();

    return function (params = {}) {
        const id = ++counter;
        const dt = new Date(timestamp + id * 1000);
        const text = 'text' in params ? params.text : `message ${id}`;

        return {
            html: 'html' in params ? params.html : `<p>${text}</p>`,
            id: id,
            inserted_at: dt.toJSON(),
            room_id: 'room_id' in params ? params.room_id : 0,
            text: text,
            type: 'type' in params ? params.type : 'text',
            updated_at: dt.toJSON(),
            upload: 'upload' in params ? params.upload : null,
            user: 'user' in params ? params.user : null,
        };
    };
})();

// Generate a response to a list_messages push.
//
PayloadFactory.messages = function (number, params = {}) {
    let messages = [];

    for (let i = 0; i < number; i++) {
        messages.push(PayloadFactory.message(params));
    }

    return { messages };
};

// Generate a response to a move_marker push or a marker_moved event.
//
PayloadFactory.marker = function (params = {}) {
    return {
        room_id:
            'room_id' in params ? params.room_id : PayloadFactory.room().id,
        message_id: 'message_id' in params ? params.message_id : 1,
        updated_at: new Date().toJSON(),
        user_id:
            'user_id' in params ? params.user_id : PayloadFactory.user().id,
    };
};

// Generate an upload object — used in messages of types image and attachment.
//
PayloadFactory.upload = (function () {
    let counter = 0;

    const imageUpload = function (id) {
        return {
            id: id,
            mime_type: 'image/jpeg',
            name: 'axolotl.jpg',
            original: {
                height: 358,
                url: `https://hub.kabelwerk.io/media/uploads/TOKEN-${id}`,
                width: 480,
            },
            preview: {
                height: 358,
                url: `https://hub.kabelwerk.io/media/uploads/TOKEN-${id}/preview`,
                width: 480,
            },
        };
    };

    const pdfUpload = function (id) {
        return {
            id: id,
            mime_type: 'application/pdf',
            name: 'document.pdf',
            original: {
                height: null,
                url: `https://hub.kabelwerk.io/media/uploads/TOKEN-${id}`,
                width: null,
            },
            preview: {
                height: 96,
                url: 'https://hub.kabelwerk.io/assets/attachment.png',
                width: 96,
            },
        };
    };

    return function (params = {}) {
        const id = ++counter;
        const mimeType =
            'mime_type' in params ? params.mime_type : 'image/jpeg';

        switch (mimeType) {
            case 'application/pdf':
                return pdfUpload(id);
            case 'image/jpeg':
                return imageUpload(id);
            default:
                throw new Error('not implemented');
        }
    };
})();

// Generate a response to joining a room channel as an end user.
//
PayloadFactory.roomJoin = function (number, params = {}) {
    return Object.assign(
        PayloadFactory.room(params),
        PayloadFactory.messages(number, params),
        { markers: 'markers' in params ? params.markers : [null, null] },
    );
};

// Generate a response to joining a room channel as a hub user.
//
PayloadFactory.hubRoomJoin = function (number, params = {}) {
    return Object.assign(
        PayloadFactory.hubRoom(params),
        PayloadFactory.messages(number, params),
        { markers: 'markers' in params ? params.markers : [null, null] },
    );
};

//
// notifier channels
//

// Generate a response to joining a notifier channel.
//
PayloadFactory.notifierJoin = function (number, params = {}) {
    return Object.assign(PayloadFactory.messages(number, params));
};

// Generate a message_posted event (in a notifier channel).
//
PayloadFactory.notifierMessage = function (params = {}) {
    return {
        message: PayloadFactory.message(params),
    };
};

export { PayloadFactory };
