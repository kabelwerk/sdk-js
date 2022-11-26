const sidebars = {
    tutorialSidebar: [
        'README',
        {
            type: 'category',
            label: 'Kabelwerk',
            link: { type: 'doc', id: 'kabelwerk' },
            items: ['config', 'connection-states'],
            collapsible: true,
            collapsed: false,
        },
        'inboxes',
        {
            type: 'category',
            label: 'Rooms',
            link: { type: 'doc', id: 'rooms' },
            items: ['messages', 'uploads'],
            collapsible: true,
            collapsed: false,
        },
        'notifiers',
    ],
};

module.exports = sidebars;
