import type {
	ArrayEntryValue,
	IndexedCollection,
	OwnEnumerableValues,
} from './internal-types.js';

/**
A strongly-typed version of `Object.values()`.

This is useful since `Object.values()` always returns `T[]`. This function returns a strongly-typed array of the values of the given object.

@note A type other than an array, tuple, typed array, `Buffer`, or function resolves to all of its declared members, so the result may include values that `Object.values()` never returns: prototype methods on a class instance, non-enumerable properties (such as `message` on an `Error`), and built-ins that keep their state in internal slots, such as `Date`, `Map`, and `URL`, where the runtime result is `[]`. TypeScript cannot tell these apart from own enumerable properties. A function resolves to only the keys it declares beyond the `Function` interface.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/pull/12253)

@example
```
import {objectValues} from 'ts-extras';

interface Point {
	x: number;
	label?: string;
}

const point: Point = {x: 1, label: 'origin'};

const stronglyTypedValues = objectValues(point);
//=> Array<number | string>

const untypedValues = Object.values(point);
//=> Array<any>
```

@category Improved builtin
*/
// We intentionally use `object` to accept interfaces. Intentionally unsafe cast to provide strongly-typed Object.values().
export const objectValues = Object.values as {
	<Type extends readonly unknown[] | IndexedCollection>(value: Type): Array<ArrayEntryValue<Type>>;
	// A primitive string stores its characters as indexed own properties, which is the one value the array path does not match and the object path cannot describe.
	(value: string): string[];
	<Type extends object>(value: Type): Array<OwnEnumerableValues<Type>>;
};
