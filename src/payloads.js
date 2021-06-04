//
// downstream frames
//


const parseUser = function(payload) {
    return {
        id: payload.id,
        key: payload.key,
        name: payload.name,
    };
};


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


// Parse the payload of a list_messages response or a successful room channel
// join response.
//
export const parseMessageList = function(payload) {
    return {
        messages: payload.messages.map(parseMessage),
    };
};


// Parse the payload of an inbox_updated event.
//
export const parseInboxRoom = function(payload) {
    return {
        id: payload.id,
        hubId: payload.hub_id,
        lastMessage: parseMessage(payload.last_message),
    };
};


// Parse the payload of a list_rooms response.
//
export const parseInbox = function(payload) {
    return {
        rooms: payload.rooms.map(parseInboxRoom),
    };
};
