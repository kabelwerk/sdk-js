// Factory for user objects as they would come from the backend.
//
export const userFactory = (function() {
    let counter = 0;

    const create = function(params) {
        let id = ++counter;
        return {
            attributes: {},
            hub_id: null,
            id: id,
            key: `key_${id}`,
            name: `user ${id}`,
        };
    };

    return { create };
})();


// Factory for message objects as they would come from the backend.
//
export const messageFactory = (function() {
    let counter = 0;
    let timestamp = new Date().getTime();

    const create = function(params) {
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

    const createBatch = function(number, params) {
        let batch = [];
        for (let i = 0; i <= number; i++) {
            batch.push(create(params));
        }
        return batch;
    };

    return { create, createBatch };
})();


// Factory for inbox room objects as they would come from the backend.
//
export const inboxRoomFactory = (function() {
    let counter = 0;

    const create = function() {
        let id = ++counter;
        let user = userFactory.create();
        return {
            id: id,
            hub_id: null,
            last_message: messageFactory.create({room_id: id}),
            user: {
                id: user.id,
                key: user.key,
                name: user.name,
            },
        };
    };

    const createBatch = function(number) {
        let batch = [];
        for (let i = 0; i <= number; i++) {
            batch.push(create());
        }
        return batch;
    };

    return { create, createBatch };
})();
