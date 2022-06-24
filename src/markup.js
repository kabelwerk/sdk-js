// regex and replacer function to find markdown inline links (as opposed to
// reference links), e.g. [an example](http://example.com/)
const LINK_REGEX = /\[(.+)\]\(([A-Za-z0-9+.-]+:\/\/[\p{L}0-9.:\/_?&=+#-]+)\)/gu;
const LINK_REPL = function (match, p1, p2) {
    try {
        new URL(p2);
        return `<a href="${p2}">${p1}</a>`;
    } catch {
        return match;
    }
};

// regex and replacer function to find URLs placed in message texts without
// additional markup
//
// this intentionally only works for web URLs — tech-savvy users should use
// markdown links for non-web protocols
const BARE_URL_REGEX = /(?<=\s|^)(https?:\/\/[\p{L}0-9.-]+\/?)/gu;
const BARE_URL_REPL = function (match) {
    try {
        new URL(match);
        return `<a href="${match}">${match}</a>`;
    } catch {
        return match;
    }
};

const toHTML = function (text) {
    text = text
        .replaceAll(BARE_URL_REGEX, BARE_URL_REPL)
        .replaceAll(LINK_REGEX, LINK_REPL)
        .replaceAll(/(?<!\\)(\*{2})([^\*]+)\1/g, '<strong>$2</strong>')
        .replaceAll(/(?<!\\)(_{2})([^_]+)\1/g, '<strong>$2</strong>')
        .replaceAll(/(?<!\\)(\*)([^\*]+)\1/g, '<em>$2</em>')
        .replaceAll(/(?<!\\)(_)([^_]+)\1/g, '<em>$2</em>');

    return text;
};

export { toHTML };
