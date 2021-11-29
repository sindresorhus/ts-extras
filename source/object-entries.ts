/**
A strongly-typed version of `Object.entries()`.

This is useful since `Object.entries()` always returns an array of `Array<[string, T]>`. This function returns a strongly-typed array of the entries of the given object.

- [TypeScript issues about this](https://github.com/microsoft/TypeScript/pull/12253)

@example
```
import {objectEntries} from 'ts-extras';

const stronglyTypedEntries = objectEntries({a: 1, b: 2, c: 3});
//=> Array<['a' | 'b' | 'c', number]>

const untypedEntries = Object.entries(items);
//=> Array<[string, number]>
```
*/
export function objectEntries<Type extends Record<PropertyKey, unknown>, Key extends `${Exclude<keyof Type, symbol>}`>(value: Type): Array<[Key, Type[Key]]> {
	return Object.entries(value) as Array<[Key, Type[Key]]>;
}
