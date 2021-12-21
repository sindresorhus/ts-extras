/**
A strongly-typed version of `Object.fromEntries()`.

This is useful since `Object.fromEntries()` always returns `{ [k: string]: T }`. This function returns a strongly-typed object from given array of entries.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/issues/35745)

@example
```
import {objectFromEntries} from 'ts-extras';

const stronglyTypedObjectFromEntries = objectFromEntries([
	['a', 123],
	['b', 'someString'],
	['c', true],
]);
//=> {
	a: number;
	b: string;
	c: boolean;
}

const untypedEntries = Object.fromEntries(entries);
//=> { [k: string]: string; }
```

@category Improved builtin
@category Type guard
*/
export function objectFromEntries<Key extends PropertyKey, Entries extends Array<[Key, any]>>(value: Entries): {
	[K in Extract<Entries[number], [Key, any]>[0]]: Extract<Entries[number], [K, any]>[1]
} {
	return Object.fromEntries(value) as {
		[K in Extract<Entries[number], [Key, any]>[0]]: Extract<Entries[number], [K, any]>[1]
	};
}
