# ts-extras

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
