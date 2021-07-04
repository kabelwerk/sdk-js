//
// private channel
//


// Parse the payload of a successful join response.
//
export const parseOwnUser = function(payload) {
    return {
        hubId: payload.hub_id,
        id: payload.id,
        insertedAt: new Date(payload.inserted_at),
        key: payload.key,
        name: payload.name,
        updatedAt: new Date(payload.updated_at),
    };
};


//
// user inbox channel
//


// Parse the payload of an inbox_updated event.
//
export const parseUserInboxRoom = function(payload) {
    return {
        id: payload.id,
        hubId: payload.hub_id,
        lastMessage: parseMessage(payload.last_message),
    };
};


// Parse the payload of a list_rooms response.
//
export const parseUserInbox = function(payload) {
    return {
        rooms: payload.rooms.map(parseUserInboxRoom),
    };
};


//
// hub inbox channel
//


// Parse the payload of an inbox_updated event.
//
export const parseHubInboxRoom = function(payload) {
    return {
        archived: payload.archived,
        attributes: payload.attributes,
        hubId: payload.hub_id,
        hubUserId: payload.hub_user_id,
        id: payload.id,
        lastMessage: parseMessage(payload.last_message),
        user: parseUser(payload.user),
    };
};


// Parse the payload of a list_rooms response.
//
export const parseHubInbox = function(payload) {
    return {
        rooms: payload.rooms.map(parseHubInboxRoom),
    };
};


//
// room channel
//


// Parse the payload of a message_posted event.
//
export const parseMessage = function(payload) {
    return {
        id: payload.id,
        insertedAt: new Date(payload.inserted_at),
        roomId: payload.room_id,
        text: payload.text,
        updatedAt: new Date(payload.updated_at),
        user: payload.user ? parseUser(payload.user) : null,
    };
};


// Parse the payload of a list_messages response or a successful join response.
//
export const parseMessageList = function(payload) {
    return {
        messages: payload.messages.map(parseMessage),
    };
};


// Parse the payload of a get_attributes or a set_attributes response.
//
export const parseAttributes = function(payload) {
    return {
        attributes: payload.attributes,
        id: payload.id,
    };
};


// Parse the payload of a get_inbox_info, an assign, or an archive response.
//
export const parseInboxInfo = function(payload) {
    return {
        archived: payload.archived,
        attributes: payload.attributes,
        hubUser: parseUser(payload.user),
        id: payload.id,
    };
};


//
// helpers
//


// Helper for parseMessage, parseHubInboxRoom, and parseInboxInfo.
//
const parseUser = function(payload) {
    return {
        id: payload.id,
        key: payload.key,
        name: payload.name,
    };
};
