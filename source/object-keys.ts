import type {
	AnyOnly,
	ArrayEntryKey,
	IndexedCollection,
	OwnEnumerableKeys,
} from './internal-types.js';

/**
A strongly-typed version of `Object.keys()`.

This is useful since `Object.keys()` always returns an array of strings. This function returns a strongly-typed array of the keys of the given object.

Arrays, tuples, typed arrays, and `Buffer` resolve to their own element keys only. Every other `keyof` member of those types (`length`, `push`, `subarray`, and the rest of the prototype) lives on the prototype and so can never be an own key. A `DataView` and a plain object that happens to have `buffer`, `byteLength` and `byteOffset` have no indices, so they keep the conservative object typing.

@note Every other type, except a function, resolves to all of its declared members, so the result may include keys that `Object.keys()` never returns: prototype methods on a class instance, non-enumerable properties (such as `message` on an `Error`), and built-ins that keep their state in internal slots, such as `Date`, `Map`, and `URL`, where the runtime result is `[]`. TypeScript cannot tell these apart from own enumerable properties. A function resolves to only the keys it declares beyond the `Function` interface.

- [Explanation](https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript)
- [TypeScript issues about this](https://github.com/microsoft/TypeScript/issues/45390)

@example
```
import {objectKeys} from 'ts-extras';

const stronglyTypedItems = objectKeys({a: 1, b: 2, c: 3}); // => Array<'a' | 'b' | 'c'>
const untypedItems = Object.keys({a: 1, b: 2, c: 3}); // => Array<string>

const stronglyTypedTupleItems = objectKeys(['a', 'b'] as const); // => Array<'0' | '1'>
```

@category Improved builtin
@category Type guard
*/
// Intentionally unsafe cast to provide strongly-typed Object.keys().
export const objectKeys = Object.keys as {
	<Type>(value: Type & AnyOnly<Type>): string[];
	<Type extends readonly unknown[] | IndexedCollection>(value: Type): Array<ArrayEntryKey<Type>>;
	// A primitive string stores its characters as indexed own properties, which is the one value the array path does not match and the object path cannot describe.
	(value: string): Array<`${number}`>;
	<Type extends object>(value: Type): Array<ObjectKeys<Type>>;
};

/**
The keys `objectKeys()` reports for a value of the given type, as a union of template-literal strings.

An array, tuple, typed array, or `Buffer` member answers its element keys, and every other member answers its own enumerable keys. A union is answered member by member, so a value that is either an array or an object reports both.

@category General

@example
```
import type {ObjectKeys} from 'ts-extras';

type Keys = ObjectKeys<{a: number; b: string}>;
//=> 'a' | 'b'

type TupleKeys = ObjectKeys<readonly ['a', 'b']>;
//=> '0' | '1'
```
*/
// The overload below picks the array path from the parameter's own type, and a union that merges an array with a plain object does not match it, so it takes the object path. `OwnEnumerableKeys` would report every `Array.prototype` member for the array member, and all of those live on the prototype. Routing per member gives each one the answer its own path gives.
export type ObjectKeys<T extends object> = T extends readonly unknown[] | IndexedCollection
	? ArrayEntryKey<T>
	: `${Exclude<OwnEnumerableKeys<T>, symbol>}`;
