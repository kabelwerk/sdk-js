import { toHTML } from '../src/markup.js';

const expectHTML = function (text, html) {
    expect(toHTML(text)).toEqual(html);
};

// source: https://daringfireball.net/projects/markdown/syntax#link
test('inline links — daring fireball', () => {
    // expectHTML(
    //     'This is [an example](http://example.com/ "Title") inline link.',
    //     'This is <a href="http://example.com/" title="Title">an example</a> inline link.'
    // );
    expectHTML(
        '[This link](http://example.net/) has no title attribute.',
        '<a href="http://example.net/">This link</a> has no title attribute.'
    );
});

test('inline links — internationalised domain names', () => {
    expectHTML(
        '[Tübingen](http://tübingen.berlin/)',
        '<a href="http://tübingen.berlin/">Tübingen</a>'
    );
    expectHTML(
        '[Нещо такова](http://пример.бг/?)',
        '<a href="http://пример.бг/?">Нещо такова</a>'
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
});

test('bare urls — internationalised domain names', () => {
    expectHTML(
        'auf Deutsch: http://Bücher.example',
        'auf Deutsch: <a href="http://Bücher.example">http://Bücher.example</a>'
    );
    expectHTML(
        'https://глагол.орг/прашни-думи/ – на български',
        '<a href="https://глагол.орг/прашни-думи/">https://глагол.орг/прашни-думи/</a> – на български'
    );
});

// source: https://daringfireball.net/projects/markdown/syntax#em
test('emphasis — daring fireball', () => {
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

test('emphasis — whitespace', () => {
    expectHTML('* no *', '* no *');
    expectHTML('_ no_', '_ no_');

    expectHTML('**no **', '**no **');
    expectHTML('__ no __', '__ no __');
});

test('emphasis — nested', () => {
    expectHTML(
        '***bold and italic***',
        '<em><strong>bold and italic</strong></em>'
    );
    expectHTML(
        '*italic **italic and bold***',
        '<em>italic <strong>italic and bold</strong></em>'
    );
    expectHTML(
        '**_italic and bold_ bold**',
        '<strong><em>italic and bold</em> bold</strong>'
    );
});

// source: https://daringfireball.net/projects/markdown/syntax#code
// test('code — daring fireball', () => {
//     expectHTML(
//         'Use the `printf()` function.',
//         'Use the <code>printf()</code> function.'
//     );
//     expectHTML(
//         '``There is a literal backtick (`) here.``',
//         '<code>There is a literal backtick (`) here.</code>'
//     );
// });
