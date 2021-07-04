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
        let id = params.id ? params.id : ++counter;
        let user = params.user ? params.user : privateChannelFactory.createOwnUser();

        return {
            archived: false,
            attributes: {},
            hub_id: 1,
            hub_user_id: null,
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

    const createMessage = function(params) {
        let id = ++counter;
        let dt = new Date(timestamp + id * 1000);
        return {
            id: id,
            inserted_at: dt.toJSON(),
            room_id: params.room_id,
            text: `message ${id}`,
            updated_at: dt.toJSON(),
            user: null,
        };
    };

    const createMessageList = function(number, params) {
        let list = [];
        for (let i = 0; i <= number; i++) {
            list.push(createMessage(params));
        }
        return list;
    };

    return { createMessage, createMessageList };
})();
