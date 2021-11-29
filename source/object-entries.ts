import {ObjectKeys} from './object-keys';

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
export function objectEntries<Type extends Record<PropertyKey, unknown>>(value: Type): Array<[ObjectKeys<Type>, Type[ObjectKeys<Type>]]> {
	return Object.entries(value) as Array<[ObjectKeys<Type>, Type[ObjectKeys<Type>]]>;
}
