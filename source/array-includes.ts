/**
An alternative to `Array.prototype.includes` that properly acts as a type guard.

It was [rejected](https://github.com/microsoft/TypeScript/issues/26255#issuecomment-748211891) from being done in TypeScript itself.

@example
```
import {arrayIncludes} from 'ts-extras';

const values = ['a', 'b', 'c'] as const;
const valueToCheck: unknown = 'a';

if (arrayIncludes(values, valueToCheck)) {
	// We now know that the value is of type `typeof values[number]`.
}
```
*/
export function arrayIncludes<Type>(
	array: Type[] | readonly Type[],
	item: unknown,
	fromIndex?: number,
): item is Type {
	return array.includes(item as Type, fromIndex);
}
