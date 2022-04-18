# Kabelwerk Demo

A simple React app showcasing the Kabelwerk SDK for JavaScript.

## Setup

The demo has its own `package.json` and dependencies, separate from those of the SDK itself. Apart from React, the demo also depends on the [Evergreen](https://evergreen.segment.com/) UI component library and on the [Parcel](https://parceljs.org/) build tool.

```sh
# install the dependencies
npm install

# run the development server at localhost:1234
npm run start
```

In order to connect, you will need: (1) the WebSocket URL of a running Kabelwerk backend to connect to; and (2) a valid JWT token. If you have come across this README accidentally and you are curious to try it out, feel free to get in touch with us at devs@kabelwerk.io.
