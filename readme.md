# ts-extras [![](https://img.shields.io/badge/unicorn-approved-ff69b4.svg)](https://giphy.com/gifs/illustration-rainbow-unicorn-26AHG5KGFxSkUWw1i) <!-- Hidden until they actually show some useful info [![npm dependents](https://badgen.net/npm/dependents/ts-extras)](https://www.npmjs.com/package/ts-extras?activeTab=dependents) [![npm downloads](https://badgen.net/npm/dt/ts-extras)](https://www.npmjs.com/package/ts-extras) --> [![Docs](https://paka.dev/badges/v0/cute.svg)](https://paka.dev/npm/ts-extras)

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

**General**

- [`asMutable`](source/as-mutable.ts) - Cast the given value to be [`Mutable`](https://github.com/sindresorhus/type-fest/blob/main/source/mutable.d.ts).

**Type guard**

- [`isDefined`](source/is-defined.ts) - Check whether a value is defined (not `null` or `undefined`).
- [`isEmpty`](source/is-empty.ts) - Check whether an array is empty.
- [`assertError`](source/assert-error.ts) - Assert that the given value is an `Error`.
- [`isEqualType`](source/is-equal.ts) - Check whether two types are equal.

**Improved builtin**

- [`arrayIncludes`](source/array-includes.ts) - An alternative to `Array#includes()` that properly acts as a type guard.
- [`objectKeys`](source/object-keys.ts) - A strongly-typed version of `Object.keys()`.
- [`objectEntries`](source/object-entries.ts) - A strongly-typed version of `Object.entries()`.
- [`objectHasOwn`](source/object-has-own.ts) - A strongly-typed version of `Object.hasOwn()`.
- [`isFinite`](source/is-finite.ts) - A strongly-typed version of `Number.isFinite()`.
- [`isInteger`](source/is-integer.ts) - A strongly-typed version of `Number.isInteger()`.
- [`isSafeInteger`](source/is-safe-integer.ts) - A strongly-typed version of `Number.isSafeInteger()`.

## FAQ

#### What is the difference between this and `type-fest`?

The `type-fest` package contains only types, meaning they are only used at compile-time and nothing is ever compiled into actual JavaScript code. This package contains functions that are compiled into JavaScript code and used at runtime.

## Related

- [type-fest](https://github.com/sindresorhus/type-fest) - A collection of essential TypeScript types
- [is](https://github.com/sindresorhus/is) - Type guards for any situation
