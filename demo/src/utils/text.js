export const ellideText = (length, text) => {
    if (text.length > length) {
        return text.slice(0, length).concat('...');
    }

    return text;
};
