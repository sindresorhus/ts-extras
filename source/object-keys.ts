/**
A typed implementation of `Object.keys()`.

This is useful since `Object.keys()` returns an array of strings. This function returns an array of the type keys of the given object.

@example
```ts
import {objectKeys} from 'ts-extras';

type Item = ['a', 'b', 'c'];
declare let: items: Item[];

items = objectKeys({a: 1, b: 2, c: 3}); // This is valid.
```
*/
export function objectKeys<Type extends Record<string, unknown>, Key extends Extract<keyof Type, string>>(
	value: Type,
): Key[] {
	return Object.keys(value) as Key[];
}
