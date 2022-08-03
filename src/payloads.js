//
// private channel
//

// Parse the response of a join response.
//
export const parsePrivateJoin = function (payload) {
    return {
        roomIds: payload.room_ids,
        user: parseOwnUser(payload.user),
    };
};

// Parse the payload of an update_user response, or of a user_updated event.
//
export const parseOwnUser = function (payload) {
    return {
        hubId: payload.hub_id,
        id: payload.id,
        insertedAt: new Date(payload.inserted_at),
        key: payload.key,
        name: payload.name,
        updatedAt: new Date(payload.updated_at),
    };
};

// Parse the payload of a get_hub response.
//
export const parseOwnHub = function (payload) {
    return {
        id: payload.id,
        name: payload.name,
        users: payload.users.map(parseUser),
    };
};

//
// user inbox channel
//

// Parse the payload of an inbox_updated event.
//
export const parseUserInboxItem = function (payload, user) {
    return {
        room: {
            hub: parseHub(payload.room.hub),
            id: payload.room.id,
        },
        message: payload.message ? parseMessage(payload.message) : null,
        isNew: payload.marked_by.indexOf(user.id) == -1,
    };
};

// Parse the payload of a list_rooms response.
//
export const parseUserInbox = function (payload, user) {
    return {
        items: payload.items.map(function (item) {
            return parseUserInboxItem(item, user);
        }),
    };
};

//
// hub inbox channel
//

// Parse the payload of an inbox_updated event.
//
export const parseHubInboxItem = function (payload, user) {
    return {
        room: {
            archived: payload.room.archived,
            assignedTo: payload.room.hub_user_id,
            attributes: payload.room.attributes,
            hubId: payload.room.hub_id,
            id: payload.room.id,
            user: parseUser(payload.room.user),
        },
        message: payload.message ? parseMessage(payload.message) : null,
        isNew: payload.marked_by.indexOf(user.id) == -1,
    };
};

// Parse the payload of a list_rooms response.
//
export const parseHubInbox = function (payload, user) {
    return {
        items: payload.items.map(function (item) {
            return parseHubInboxItem(item, user);
        }),
    };
};

//
// room channel
//

// Parse the payload of a (get|set)_attributes response.
//
export const parseRoom = function (payload) {
    return {
        attributes: payload.attributes,
        id: payload.id,
        user: parseUser(payload.user),
    };
};

// Parse the payload of a (get|set)_inbox_info response.
//
export const parseHubRoom = function (payload) {
    return Object.assign(parseRoom(payload), {
        archived: payload.archived,
        hubUser: payload.hub_user ? parseUser(payload.hub_user) : null,
    });
};

// Parse the payload of a message_posted event or a post_message response.
//
export const parseMessage = function (payload) {
    return {
        html: payload.html,
        id: payload.id,
        insertedAt: new Date(payload.inserted_at),
        roomId: payload.room_id,
        text: payload.text,
        type: payload.type,
        updatedAt: new Date(payload.updated_at),
        upload: payload.upload ? parseUpload(payload.upload) : null,
        user: payload.user ? parseUser(payload.user) : null,
    };
};

// Parse the payload of a list_messages response.
//
export const parseMessages = function (payload) {
    return {
        messages: payload.messages.map(parseMessage),
    };
};

// Parse the payload of a move_marker response or a marker_moved event.
//
export const parseMarker = function (payload) {
    return {
        messageId: payload.message_id,
        updatedAt: new Date(payload.updated_at),
        userId: payload.user_id,
    };
};

// Parse the payload of a join response (end side).
//
export const parseRoomJoin = function (payload) {
    return Object.assign(parseRoom(payload), {
        messages: payload.messages.map(parseMessage),
        markers: payload.markers.map((item) =>
            item == null ? null : parseMarker(item)
        ),
    });
};

// Parse the payload of a join response (hub side).
//
export const parseHubRoomJoin = function (payload) {
    return Object.assign(parseHubRoom(payload), {
        messages: payload.messages.map(parseMessage),
        markers: payload.markers.map((item) =>
            item == null ? null : parseMarker(item)
        ),
    });
};

//
// notifier channel
//

// Parse the payload of a join response.
//
export const parseNotifierJoin = function (payload) {
    return {
        messages: payload.messages.map(parseMessage),
    };
};

// Parse the payload of a message_posted event.
//
export const parseNotifierMessage = function (payload) {
    return {
        message: parseMessage(payload.message),
    };
};

//
// helpers
//

// Helper for parseUserInboxItem.
//
const parseHub = function (payload) {
    return {
        id: payload.id,
        name: payload.name,
        slug: payload.slug,
    };
};

// Helper for parseMessage.
//
const parseUpload = function (payload) {
    return {
        id: payload.id,
        mimeType: payload.mime_type,
        name: payload.name,
        original: {
            height: payload.original.height,
            url: payload.original.url,
            width: payload.original.width,
        },
        preview: {
            height: payload.preview.height,
            url: payload.preview.url,
            width: payload.preview.width,
        },
    };
};

// Helper for parseMessage, parseHubInboxRoom, parseInboxInfo, and others.
//
const parseUser = function (payload) {
    return {
        id: payload.id,
        key: payload.key,
        name: payload.name,
    };
};
