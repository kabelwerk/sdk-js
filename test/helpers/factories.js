// Factory for message objects as they would come from the backend.
//
const messageFactory = (function() {
    let counter = 0;

    const create = function(params) {
        let id = ++counter;
        let now = new Date();
        return {
            id: id,
            inserted_at: now.toJSON(),
            room_id: params.room_id,
            text: `message ${id}`,
            updated_at: now.toJSON(),
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
const inboxRoomFactory = (function() {
    let counter = 0;

    const create = function() {
        let id = ++counter;
        return {
            id: id,
            hub_id: null,
            last_message: messageFactory.create({room_id: id}),
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


export { inboxRoomFactory, messageFactory };
