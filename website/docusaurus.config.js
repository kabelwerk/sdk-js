// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
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
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/kabelwerk/sdk-js',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Kabelwerk SDK for JavaScript',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
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
    }),
};

module.exports = config;
