# ts-extras [![](https://img.shields.io/badge/unicorn-approved-ff69b4.svg)](https://giphy.com/gifs/illustration-rainbow-unicorn-26AHG5KGFxSkUWw1i) [![npm dependents](https://badgen.net/npm/dependents/ts-extras)](https://www.npmjs.com/package/type-fest?activeTab=dependents) [![npm downloads](https://badgen.net/npm/dt/ts-extras)](https://www.npmjs.com/package/ts-extras) [![Docs](https://paka.dev/badges/v0/cute.svg)](https://paka.dev/npm/ts-extras)

> Essential utilities for TypeScript projects

*Still early in development. Ideas for additional **essential** utilities welcome. Type-only utilities belong in [type-fest](https://github.com/sindresorhus/type-fest).*

## Install

```sh
npm install ts-extras
```

## Usage

```js
import {isDefined} from 'ts-extras';

[1, null, 2, undefined].filter(isDefined);
//=> [1, 2]
```

## API

See the [source](index.ts) for now. Proper docs will come at some point.

## FAQ

#### What is the difference between this and `type-fest`?

The `type-fest` package contains only types, meaning they are only used at compile-time and nothing is ever compiled into actual JavaScript code. This package contains functions that are compiled into JavaScript code and used at runtime.

## Related

- [type-fest](https://github.com/sindresorhus/type-fest) - A collection of essential TypeScript types
- [is](https://github.com/sindresorhus/is) - Type guards for any situation
