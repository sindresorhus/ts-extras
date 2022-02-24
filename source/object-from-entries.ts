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

const untypedEntries = Object.fromEntries(entries);
//=> {[key: string]: string}
```

@category Improved builtin
@category Type guard
*/
export function objectFromEntries<Key extends PropertyKey, Entries extends ReadonlyArray<readonly [Key, unknown]>>(value: Entries): {
	[K in Extract<Entries[number], readonly [Key, unknown]>[0]]: Extract<Entries[number], readonly [K, unknown]>[1]
} {
	return Object.fromEntries(value) as {
		[K in Extract<Entries[number], [Key, unknown]>[0]]: Extract<Entries[number], [K, unknown]>[1]
	};
}
