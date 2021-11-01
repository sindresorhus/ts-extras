/**
A better version `Array.prototype.includes` which allows other types to be included and also acts as a type guard when the provided array is of a specific type.

This is needed because `Array.prototype.includes` doesn't allow for other types to be included.

@example
```ts
import {arrayIncludes} from 'ts-extras';

const values = ['a', 'b', 'c'] as const;
const valueToCheck: unknown = 'a';

if (arrayIncludes(values, valueToCheck)) {
  // Now we know that the value is of type `typeof values[number]`.
}
```
*/
export function arrayIncludes<Type>(
	array: Type[] | readonly Type[],
	item: unknown,
	fromIndex?: number
): item is Type {
	return array.includes(item as Type, fromIndex);
}
