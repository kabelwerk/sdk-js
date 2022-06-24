import { toHTML } from '../src/markup.js';

const expectHTML = function (text, html) {
    expect(toHTML(text)).toEqual(html);
};

// source: https://daringfireball.net/projects/markdown/syntax#link
test('inline links', () => {
    // expectHTML(
    //     'This is [an example](http://example.com/ "Title") inline link.',
    //     'This is <a href="http://example.com/" title="Title">an example</a> inline link.'
    // );
    expectHTML(
        '[This link](http://example.net/) has no title attribute.',
        '<a href="http://example.net/">This link</a> has no title attribute.'
    );
});

test('bare urls', () => {
    expectHTML(
        'https://kabelwerk.io',
        '<a href="https://kabelwerk.io">https://kabelwerk.io</a>'
    );
    expectHTML(
        'nowhitespacehttps://kabelwerk.io',
        'nowhitespacehttps://kabelwerk.io'
    );

    // internationalised domain names
    expectHTML(
        'auf Deutsch: http://Bücher.example',
        'auf Deutsch: <a href="http://Bücher.example">http://Bücher.example</a>'
    );
    expectHTML(
        'https://глагол.орг – на български',
        '<a href="https://глагол.орг">https://глагол.орг</a> – на български'
    );
});

// source: https://daringfireball.net/projects/markdown/syntax#em
test('emphasis', () => {
    expectHTML('*single asterisks*', '<em>single asterisks</em>');
    expectHTML('_single underscores_', '<em>single underscores</em>');
    expectHTML('**double asterisks**', '<strong>double asterisks</strong>');
    expectHTML('__double underscores__', '<strong>double underscores</strong>');

    expectHTML('un*frigging*believable', 'un<em>frigging</em>believable');
    expectHTML(
        '\\*this text is surrounded by literal asterisks\\*',
        '\\*this text is surrounded by literal asterisks\\*'
    );
});

// source: https://daringfireball.net/projects/markdown/syntax#code
// test('code', () => {
//     expectHTML(
//         'Use the `printf()` function.',
//         'Use the <code>printf()</code> function.'
//     );
//     expectHTML(
//         '``There is a literal backtick (`) here.``',
//         '<code>There is a literal backtick (`) here.</code>'
//     );
// });
