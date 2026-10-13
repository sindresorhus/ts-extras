import {type ObjectKeys} from './object-keys.js';
import type {
	AnyOnly,
	ArrayEntryKey,
	ArrayEntryValue,
	IndexedCollection,
	OwnEnumerableValues,
} from './internal-types.js';

/**
A strongly-typed version of `Object.entries()`.

This is useful since `Object.entries()` always returns an array of `Array<[string, T]>`. This function returns a strongly-typed array of the entries of the given object.

@note A type other than an array, tuple, typed array, `Buffer`, or function resolves to all of its declared members, so the result may include entries that `Object.entries()` never returns: prototype methods on a class instance, non-enumerable properties (such as `message` on an `Error`), and built-ins that keep their state in internal slots, such as `Date`, `Map`, and `URL`, where the runtime result is `[]`. TypeScript cannot tell these apart from own enumerable properties. A function resolves to only the keys it declares beyond the `Function` interface.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/pull/12253)

@example
```
import {objectEntries} from 'ts-extras';

const stronglyTypedEntries = objectEntries({a: 1, b: 2, c: 3});
//=> Array<['a' | 'b' | 'c', number]>

const untypedEntries = Object.entries({a: 1, b: 2, c: 3});
//=> Array<[string, number]>
```

@category Improved builtin
*/
// We intentionally use `object` to accept interfaces. Intentionally unsafe cast to provide strongly-typed Object.entries().
export const objectEntries = Object.entries as {
	<Type>(value: Type & AnyOnly<Type>): Array<[string, any]>;
	<Type extends readonly unknown[] | IndexedCollection>(value: Type): Array<[ArrayEntryKey<Type>, ArrayEntryValue<Type>]>;
	// A primitive string stores its characters as indexed own properties, which is the one value the array path does not match and the object path cannot describe.
	(value: string): Array<[`${number}`, string]>;
	<Type extends object>(value: Type): Array<[ObjectKeys<Type>, OwnEnumerableValues<Type>]>;
};
