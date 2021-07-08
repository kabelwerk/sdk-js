// Factory for response payloads as they would come from a private channel.
//
export const privateChannelFactory = (function() {
    let counter = 0;
    let timestamp = new Date().getTime();

    const createOwnUser = function(params) {
        let id = ++counter;
        let dt = new Date(timestamp + id * 1000);
        return {
            hub_id: null,
            id: id,
            inserted_at: dt.toJSON(),
            key: `key_${id}`,
            name: `user ${id}`,
            updated_at: dt.toJSON(),
        };
    };

    return { createOwnUser };
})();


// Factory for response payloads as they would come from a user inbox channel.
//
export const userInboxChannelFactory = (function() {
    let counter = 0;

    const createInboxRoom = function(params = {}) {
        let id = params.id ? params.id : ++counter;

        return {
            hub_id: 1,
            id: id,
            last_message: roomChannelFactory.createMessage({room_id: id}),
        };
    };

    const createInbox = function(number, params = {}) {
        let rooms = [];

        for (let i = 0; i < number; i++) {
            rooms.push(createInboxRoom(params));
        }

        return { rooms };
    };

    return { createInboxRoom, createInbox };
})();


// Factory for response payloads as they would come from a hub inbox channel.
//
export const hubInboxChannelFactory = (function() {
    let counter = 0;

    const createInboxRoom = function(params = {}) {
        let id = 'id' in params ? params.id : ++counter;
        let user = 'user' in params ? params.user : privateChannelFactory.createOwnUser();

        return {
            archived: 'archived' in params ? params.archived : false,
            attributes: 'attributes' in params ? params.attributes : {},
            hub_id: 1,
            hub_user_id: 'hub_user_id' in params ? params.hub_user_id : null,
            id: id,
            last_message: roomChannelFactory.createMessage({room_id: id}),
            user: {
                id: user.id,
                key: user.key,
                name: user.name,
            },
        };
    };

    const createInbox = function(number, params = {}) {
        let rooms = [];

        for (let i = 0; i < number; i++) {
            rooms.push(createInboxRoom(params));
        }

        return { rooms };
    };

    return { createInboxRoom, createInbox };
})();


// Factory for response paylods as they would come from a room channel.
//
export const roomChannelFactory = (function() {
    let counter = 0;
    let timestamp = new Date().getTime();

    const createMessage = function(params = {}) {
        let id = ++counter;
        let dt = new Date(timestamp + id * 1000);

        return {
            id: id,
            inserted_at: dt.toJSON(),
            room_id: 'room_id' in params ? params.room_id : 0,
            text: `message ${id}`,
            updated_at: dt.toJSON(),
            user: null,
        };
    };

    const createMessageList = function(number, params = {}) {
        let messages = [];

        for (let i = 0; i < number; i++) {
            messages.push(createMessage(params));
        }

        return { messages };
    };

    const createAttributes = function(params) {
        return {
            attributes: 'attributes' in params ? params.attributes : {},
            id: 'id' in params ? params.id : ++counter,
        };
    };

    return { createMessage, createMessageList, createAttributes };
})();
