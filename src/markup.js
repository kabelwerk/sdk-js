// regex and replacer function to handle markdown inline links (as opposed to
// reference links), e.g. [an example](http://example.com/)
//
// unlike markdown's inline links, these support neither relative URLs, nor
// setting the title attribute
const LINK_REGEX = /\[(.+)\]\(([A-Za-z0-9+.-]+:\/\/[\p{L}0-9.:\/_?&=+#-]+)\)/gu;
const LINK_REPL = function (match, p1, p2) {
    try {
        new URL(p2);
        return `<a href="${p2}">${p1}</a>`;
    } catch {
        return match;
    }
};

// regex and replacer function to handle URLs placed in message texts without
// additional markup
//
// this intentionally only works for web URLs — tech-savvy users should use
// markdown links for non-web protocols
const BARE_URL_REGEX = /(?<=\s|^)(https?:\/\/[\p{L}0-9.\/-]+)/gu;
const BARE_URL_REPL = function (match) {
    try {
        new URL(match);
        return `<a href="${match}">${match}</a>`;
    } catch {
        return match;
    }
};

// regex and replacement string to handle markdown emphasis
const SINGLE_ASTERISKS_REGEX = /(?<!\\)(\*)(?!\s)([^\*]+)(?<!\s)\1/g;
const SINGLE_UNDERSCORES_REGEX = /(?<!\\)(_)(?!\s)([^_]+)(?<!\s)\1/g;
const EM_REPL = '<em>$2</em>';

// regex and replacement string to handle markdown strong emphasis
const DOUBLE_ASTERISKS_REGEX = /(?<!\\)(\*\*)(?!\s)([^\*]+)(?<!\s)\1/g;
const DOUBLE_UNDERSCORES_REGEX = /(?<!\\)(__)(?!\s)([^_]+)(?<!\s)\1/g;
const STRONG_REPL = '<strong>$2</strong>';

const toHTML = function (text) {
    text = text
        .replaceAll(BARE_URL_REGEX, BARE_URL_REPL)
        .replaceAll(LINK_REGEX, LINK_REPL)
        .replaceAll(DOUBLE_ASTERISKS_REGEX, STRONG_REPL)
        .replaceAll(DOUBLE_UNDERSCORES_REGEX, STRONG_REPL)
        .replaceAll(SINGLE_ASTERISKS_REGEX, EM_REPL)
        .replaceAll(SINGLE_UNDERSCORES_REGEX, EM_REPL);

    return text;
};

export { toHTML };
