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
- [`safeCastTo`](source/safe-cast-to.ts) - Constrain a value to the given type safely.

**Type guard**

- [`isDefined`](source/is-defined.ts) - Check whether a value is defined (not `undefined`).
- [`isEqualType`](source/is-equal-type.ts) - Check if two types are equal at compile time.
- [`isPresent`](source/is-present.ts) - Check whether a value is present (not `null` nor `undefined`).
- [`isEmpty`](source/is-empty.ts) - Check whether an array is empty.
- [`isFinite`](source/is-finite.ts) - A strongly-typed version of `Number.isFinite()`.
- [`isInfinite`](source/is-infinite.ts) - Check whether a value is infinite.
- [`isInteger`](source/is-integer.ts) - A strongly-typed version of `Number.isInteger()`.
- [`isSafeInteger`](source/is-safe-integer.ts) - A strongly-typed version of `Number.isSafeInteger()`.
- [`keyIn`](source/key-in.ts) - Check if a key is in an object and narrow the key to the object's keys.
- [`not`](source/not.ts) - Invert a type predicate function.
- [`objectHasIn`](source/object-has-in.ts) - Check if an object has a property (including inherited) and narrow the object type.
- [`assertDefined`](source/assert-defined.ts) - Assert that the given value is defined, meaning it is not `undefined`.
- [`assertPresent`](source/assert-present.ts) - Assert that the given value is present (non-nullable), meaning it is neither `null` nor `undefined`.
- [`assertError`](source/assert-error.ts) - Assert that the given value is an `Error`.

**Improved builtin**

- [`arrayAt`](source/array-at.ts) - A strongly-typed version of `Array#at()` with improved tuple support (supports `-1` and positive literal indices for tuples).
- [`arrayConcat`](source/array-concat.ts) - A strongly-typed version of `Array#concat()` that properly handles arrays of different types.
- [`arrayFirst`](source/array-first.ts) - Return the first item of an array with stronger typing for tuples.
- [`arrayIncludes`](source/array-includes.ts) - A strongly-typed version of `Array#includes()` that properly acts as a type guard.
- [`arrayLast`](source/array-last.ts) - Return the last item of an array with stronger typing for tuples.
- [`objectKeys`](source/object-keys.ts) - A strongly-typed version of `Object.keys()`.
- [`objectEntries`](source/object-entries.ts) - A strongly-typed version of `Object.entries()`.
- [`objectFromEntries`](source/object-from-entries.ts) - A strongly-typed version of `Object.fromEntries()`.
- [`objectHasOwn`](source/object-has-own.ts) - A strongly-typed version of `Object.hasOwn()`.
- [`setHas`](source/set-has.ts) - A strongly-typed version of `Set#has()` that properly acts as a type guard.
- [`stringSplit`](source/string-split.ts) - A strongly-typed version of `String#split()` that returns a tuple for literal strings.

## FAQ

#### What is the difference between `keyIn`, `objectHasIn`, and `objectHasOwn`?

These functions solve different problems despite all checking property existence:

**`keyIn`** - **Key narrowing** for union types:
- Uses the `in` operator, checking the prototype chain
- Narrows the *key* variable to only keys that exist in the object
- Best for: "Which of these possible keys actually exists?"
- Guards against `__proto__` and `constructor` for security

**`objectHasIn`** - **Object narrowing** with prototype chain:
- Uses the `in` operator, checking the prototype chain
- Narrows the *object* type to include the checked property
- Best for: "Can I safely access this property (including inherited)?"
- Guards against `__proto__` and `constructor` for security

**`objectHasOwn`** - **Object narrowing** for own properties:
- Uses `Object.hasOwn()`, checking only own properties
- Narrows the *object* type to include the checked property
- Best for: "Can I safely access this own property on this object?"

```typescript
// keyIn - narrows the key (prototype chain)
const key = 'foo' as 'foo' | 'bar' | 'baz';
if (keyIn(object, key)) {
	// `key` is now: 'foo' | 'bar' (only existing keys)
	console.log(object[key]); // Safe
}

// objectHasIn - narrows the object (prototype chain)
const data: unknown = {foo: 1};
if (objectHasIn(data, 'toString')) {
	// `data` is now: unknown & {toString: unknown}
	console.log(data.toString); // Safe (inherited method)
}

// objectHasOwn - narrows the object (own properties only)
if (objectHasOwn(data, 'foo')) {
	// `data` is now: unknown & {foo: unknown}
	console.log(data.foo); // Safe (own property)
}
```

#### What is the difference between this and `type-fest`?

The `type-fest` package contains only types, meaning they are only used at compile-time and nothing is ever compiled into actual JavaScript code. This package contains functions that are compiled into JavaScript code and used at runtime.

## Related

- [type-fest](https://github.com/sindresorhus/type-fest) - A collection of essential TypeScript types
- [is](https://github.com/sindresorhus/is) - Type guards for any situation
- [camelcase-keys](https://github.com/sindresorhus/camelcase-keys) - Runtime transformation of object properties to camel-case (like `type-fest`'s `CamelCasedPropertiesDeep`)
