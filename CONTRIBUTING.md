# How to contribute

-   [Submitting bug reports](#submitting-bug-reports)
-   [Contributing code](#contributing-code)

## Submitting bug reports

If you want to report a bug you can use the repository's [issue tracker](https://github.com/kabelwerk/sdk-js/issues) or you can contact us directly by email; the latter should be preferred if you want to report a security vulnerability.

## Contributing code

```sh
# clone the repo
git clone https://github.com/kabelwerk/sdk-js
cd sdk-js

# install the dependencies
npm install

# run the unit tests
npm test

# run prettier
npm run format
```

### Demo

This project also comes with a simple React app for demo purposes. You can try out your changes in this demo app and/or you can also contribute code to the demo app itself. Please refer to [demo/README.md](./demo/README.md) for setup info.

### Conventions

-   Follow the `.editorconfig` rules ([take a look here](https://editorconfig.org/) if this is new for you).
-   Run [Prettier](https://prettier.io/) using `npm run format` before making a commit.
