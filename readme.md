# ts-extras [![](https://img.shields.io/badge/unicorn-approved-ff69b4.svg)](https://giphy.com/gifs/illustration-rainbow-unicorn-26AHG5KGFxSkUWw1i) [![npm dependents](https://badgen.net/npm/dependents/ts-extras)](https://www.npmjs.com/package/ts-extras?activeTab=dependents) [![npm downloads](https://badgen.net/npm/dt/ts-extras)](https://www.npmjs.com/package/ts-extras)

> Essential utilities for TypeScript projects

*Ideas for additional **essential** utilities welcome. Type-only utilities belong in [type-fest](https://github.com/sindresorhus/type-fest).*

## Install

```sh
npm install ts-extras
```

## Usage

```js
import {isDefined} from 'ts-extras';

[1, undefined, 2].filter(isDefined);
//=> [1, 2]
```

## API

**General**

- [`asWritable`](source/as-writable.ts) - Cast the given value to be [`Writable`](https://github.com/sindresorhus/type-fest/blob/main/source/writable.d.ts).
- [`safeCastTo`](source/safe-cast-to.ts) - Cast a value to the given type safely.

**Type guard**

- [`isDefined`](source/is-defined.ts) - Check whether a value is defined (not `undefined`).
- [`isPresent`](source/is-present.ts) - Check whether a value is present (not `null` or `undefined`).
- [`isEmpty`](source/is-empty.ts) - Check whether an array is empty.
- [`isInfinite`](source/is-infinite.ts) - Check whether a value is infinite.
- [`assertDefined`](source/assert-defined.ts) - Assert that the given value is defined, meaning it is not `undefined`.
- [`assertPresent`](source/assert-present.ts) - Assert that the given value is present (non-nullable), meaning it is neither `null` or `undefined`.
- [`assertError`](source/assert-error.ts) - Assert that the given value is an `Error`.

**Improved builtin**

- [`arrayAt`](source/array-at.ts) - A strongly-typed version of `Array#at()` with improved tuple support (supports `-1` and positive literal indices for tuples).
- [`arrayConcat`](source/array-concat.ts) - A strongly-typed version of `Array#concat()` that properly handles arrays of different types.
- [`arrayIncludes`](source/array-includes.ts) - An alternative to `Array#includes()` that properly acts as a type guard.
- [`objectKeys`](source/object-keys.ts) - A strongly-typed version of `Object.keys()`.
- [`objectEntries`](source/object-entries.ts) - A strongly-typed version of `Object.entries()`.
- [`objectFromEntries`](source/object-from-entries.ts) - A strongly-typed version of `Object.fromEntries()`.
- [`objectHasOwn`](source/object-has-own.ts) - A strongly-typed version of `Object.hasOwn()`.
- [`setHas`](source/set-has.ts) - An alternative to `Set#has()` that properly acts as a type guard.
- [`stringSplit`](source/string-split.ts) - A strongly-typed version of `String#split()` that returns a tuple for literal strings.
- [`isFinite`](source/is-finite.ts) - A strongly-typed version of `Number.isFinite()`.
- [`isInteger`](source/is-integer.ts) - A strongly-typed version of `Number.isInteger()`.
- [`isSafeInteger`](source/is-safe-integer.ts) - A strongly-typed version of `Number.isSafeInteger()`.

## FAQ

#### What is the difference between this and `type-fest`?

The `type-fest` package contains only types, meaning they are only used at compile-time and nothing is ever compiled into actual JavaScript code. This package contains functions that are compiled into JavaScript code and used at runtime.

## Related

- [type-fest](https://github.com/sindresorhus/type-fest) - A collection of essential TypeScript types
- [is](https://github.com/sindresorhus/is) - Type guards for any situation
