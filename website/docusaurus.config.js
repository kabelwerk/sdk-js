const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const config = {
    title: 'Kabelwerk SDK for JavaScript',
    tagline: 'Dinosaurs are cool',
    url: 'https://kabelwerk.io',
    baseUrl: '/',
    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',
    favicon: 'img/logo.svg',
    organizationName: 'kabelwerk', // Usually your GitHub org/user name.
    projectName: 'sdk-js', // Usually your repo name.

    presets: [
        [
            'classic',
            {
                docs: {
                    path: '../docs',
                    routeBasePath: '/',
                    sidebarPath: require.resolve('./sidebars.js'),
                    editUrl: ({ docPath }) =>
                        `https://github.com/kabelwerk/sdk-js/blob/master/docs/${docPath}`,
                    remarkPlugins: [
                        [
                            require('@docusaurus/remark-plugin-npm2yarn'),
                            { sync: true },
                        ],
                    ],
                },
                blog: false,
                theme: {
                    customCss: require.resolve('./src/css/custom.css'),
                },
            },
        ],
    ],

    themeConfig: {
        navbar: {
            title: 'Kabelwerk SDK for JavaScript',
            logo: {
                alt: 'My Site Logo',
                src: 'img/logo.svg',
            },
            items: [
                {
                    type: 'doc',
                    docId: 'README',
                    label: 'Docs',
                    position: 'right',
                },
                {
                    href: 'https://github.com/kabelwerk/sdk-js',
                    label: 'GitHub',
                    position: 'right',
                },
            ],
        },
        footer: {
            style: 'dark',
            links: [
                {
                    title: 'Docs',
                    items: [
                        {
                            label: 'Getting started',
                            to: '/',
                        },
                    ],
                },
                {
                    title: 'The SDK',
                    items: [
                        {
                            label: 'GitHub',
                            href: 'https://github.com/kabelwerk/sdk-js',
                        },
                        {
                            label: 'npm',
                            href: 'https://www.npmjs.com/package/kabelwerk',
                        },
                    ],
                },
                {
                    title: 'Kabelwerk',
                    items: [
                        {
                            label: 'Website',
                            href: 'https://kabelwerk.io',
                        },
                    ],
                },
                {
                    title: 'Legal',
                    items: [
                        {
                            label: 'Impressum',
                            href: 'https://kabelwerk.io/impressum.html',
                        },
                        {
                            label: 'Privacy',
                            href: 'https://kabelwerk.io/privacy.html',
                        },
                    ],
                },
            ],
        },
        prism: {
            theme: lightCodeTheme,
            darkTheme: darkCodeTheme,
        },
    },
};

module.exports = config;
