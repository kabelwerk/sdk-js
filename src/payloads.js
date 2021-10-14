//
// private channel
//

// Parse the payload of a successful join response.
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
export const parseUserInboxRoom = function (payload) {
    return {
        hubId: payload.hub_id,
        id: payload.id,
        lastMessage: payload.last_message
            ? parseMessage(payload.last_message)
            : null,
    };
};

// Parse the payload of a list_rooms response.
//
export const parseUserInbox = function (payload) {
    return {
        rooms: payload.rooms.map(parseUserInboxRoom),
    };
};

//
// hub inbox channel
//

// Parse the payload of an inbox_updated event.
//
export const parseHubInboxRoom = function (payload) {
    return {
        archived: payload.archived,
        assignedTo: payload.hub_user_id,
        attributes: payload.attributes,
        hubId: payload.hub_id,
        id: payload.id,
        lastMessage: payload.last_message
            ? parseMessage(payload.last_message)
            : null,
        user: parseUser(payload.user),
    };
};

// Parse the payload of a list_rooms response.
//
export const parseHubInbox = function (payload) {
    return {
        rooms: payload.rooms.map(parseHubInboxRoom),
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
        id: payload.id,
        insertedAt: new Date(payload.inserted_at),
        roomId: payload.room_id,
        text: payload.text,
        updatedAt: new Date(payload.updated_at),
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

// Parse the payload of a join response (end side).
//
export const parseRoomJoin = function (payload) {
    return Object.assign(parseRoom(payload), parseMessages(payload));
};

// Parse the payload of a join response (hub side).
//
export const parseHubRoomJoin = function (payload) {
    return Object.assign(parseHubRoom(payload), parseMessages(payload));
};

//
// helpers
//

// Helper for parseMessage, parseHubInboxRoom, parseInboxInfo, and others.
//
const parseUser = function (payload) {
    return {
        id: payload.id,
        key: payload.key,
        name: payload.name,
    };
};
