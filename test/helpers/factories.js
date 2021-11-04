export const PayloadFactory = {};

//
// private channels
//

PayloadFactory.user = (function () {
    let counter = 0;
    let timestamp = new Date().getTime();

    return function (params) {
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
})();

//
// inbox channels
//

PayloadFactory.inboxItem = (function () {
    let counter = 0;

    return function (params = {}) {
        let id = 'id' in params ? params.id : ++counter;

        return {
            room: {
                hub_id: 1,
                id: id,
            },
            message:
                'message' in params
                    ? params.message
                    : PayloadFactory.message({ room_id: id }),
            isNew: 'is_new' in params ? params.is_new : true,
        };
    };
})();

PayloadFactory.inbox = (function () {
    return function (number, params = {}) {
        let items = [];

        for (let i = 0; i < number; i++) {
            items.push(PayloadFactory.inboxItem(params));
        }

        return { items };
    };
})();

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
            isNew: 'is_new' in params ? params.is_new : true,
        };
    };
})();

PayloadFactory.hubInbox = (function () {
    return function (number, params = {}) {
        let items = [];

        for (let i = 0; i < number; i++) {
            items.push(PayloadFactory.hubInboxItem(params));
        }

        return { items };
    };
})();

//
// room channels
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

PayloadFactory.hubRoom = (function () {
    return function (params = {}) {
        return Object.assign(PayloadFactory.room(params), {
            archived: 'archived' in params ? params.archived : false,
            archived_until:
                'archived_until' in params ? params.archived_until : null,
            hub_user: 'hub_user' in params ? params.hub_user : null,
        });
    };
})();

PayloadFactory.message = (function () {
    let counter = 0;
    let timestamp = new Date().getTime();

    return function (params = {}) {
        let id = ++counter;
        let dt = new Date(timestamp + id * 1000);

        return {
            id: id,
            inserted_at: dt.toJSON(),
            room_id: 'room_id' in params ? params.room_id : 0,
            text: `message ${id}`,
            type: 'text',
            updated_at: dt.toJSON(),
            user: null,
        };
    };
})();

PayloadFactory.messages = (function () {
    return function (number, params = {}) {
        let messages = [];

        for (let i = 0; i < number; i++) {
            messages.push(PayloadFactory.message(params));
        }

        return { messages };
    };
})();

PayloadFactory.roomJoin = (function () {
    return function (number, params = {}) {
        return Object.assign(
            PayloadFactory.room(params),
            PayloadFactory.messages(number, params)
        );
    };
})();

PayloadFactory.hubRoomJoin = (function () {
    return function (number, params = {}) {
        return Object.assign(
            PayloadFactory.hubRoom(params),
            PayloadFactory.messages(number, params)
        );
    };
})();
