# React Router with AbortSignal

![NPM Type Definitions](https://img.shields.io/npm/types/signal-react-router)
![NPM Version](https://img.shields.io/npm/v/signal-react-router)
![npm package minimized gzipped size](https://img.shields.io/bundlejs/size/signal-react-router)
[![CI](https://github.com/e7h4n/signal-react-router/actions/workflows/ci.yaml/badge.svg)](https://github.com/e7h4n/signal-react-router/actions/workflows/ci.yaml)
[![Coverage Status](https://coveralls.io/repos/github/e7h4n/signal-react-router/badge.svg?branch=main)](https://coveralls.io/github/e7h4n/signal-react-router?branch=main)
[![Maintainability](https://api.codeclimate.com/v1/badges/a0b68839fea9c990a3eb/maintainability)](https://codeclimate.com/github/e7h4n/signal-react-router/maintainability)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A TypeScript library for passing AbortSignal to React Router loaders.

## Installation

Install the library using npm or yarn:

```bash
npm install signal-react-router
# or
yarn add signal-react-router
```

## Usage

Create a decorator for React Router that fills the loader with an AbortSignal.

```typescript
import { createSignalRouterDecorator } from "signal-react-router";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

const signal = new AbortController().signal; // or any other AbortSignal
const decorateSignal = createSignalRouterDecorator(signal);

const [routes, options] = decorateSignal(
  [
    {
      path: "/",
      loader: async (loaderParams, { signal }) => {
        const data = await fetch("/api/data", { signal }); // this signal will be aborted when navigate away
        // ...
      },
    },
  ],
  {
    // router options...
  }
);
const router = createBrowserRouter(routes, options);
render(<RouterProvider router={router} />);
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
