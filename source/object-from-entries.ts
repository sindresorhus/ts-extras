/**
A strongly-typed version of `Object.fromEntries()`.

This is useful since `Object.fromEntries()` always returns `{[key: string]: T}`. This function returns a strongly-typed object from the given array of entries.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/issues/35745)

@example
```
import {objectFromEntries} from 'ts-extras';

const stronglyTypedObjectFromEntries = objectFromEntries([
	['a', 123],
	['b', 'someString'],
	['c', true],
]);
//=> {a: number; b: string; c: boolean}

const untypedEntries = Object.fromEntries([['a', 123], ['b', 'someString'], ['c', true]]);
//=> {[key: string]: unknown}
```

@category Improved builtin
@category Type guard
*/
export const objectFromEntries = Object.fromEntries as <Entries extends ReadonlyArray<readonly [PropertyKey, unknown]>>(values: Entries) => number extends Entries['length']
	? {[T in Entries[number] as T[0]]?: T[1]}
	: {[T in Entries[number] as T[0]]: T[1]};
