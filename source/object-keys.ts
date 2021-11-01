/**
A strongly-typed version of `Object.keys()`.

This is useful since `Object.keys()` always returns an array of strings. This function returns a strongly-typed array of the keys of the given object.

- [Explanation](https://stackoverflow.com/questions/55012174/why-doesnt-object-keys-return-a-keyof-type-in-typescript)
- [TypeScript issues about this](https://github.com/microsoft/TypeScript/issues/45390)

@example
```
import {objectKeys} from 'ts-extras';

const stronglyTypedItems = objectKeys({a: 1, b: 2, c: 3}); // => Array<'a' | 'b' | 'c'>
const untypedItems = Object.keys(items); // => Array<string>
```
*/
export function objectKeys<Type extends Record<string, unknown>, Key extends Extract<keyof Type, string>>(
	value: Type,
): Key[] {
	return Object.keys(value) as Key[];
}
