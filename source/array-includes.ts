/**
A strongly-typed version of `Array#includes()` that properly acts as a type guard.

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

@category Improved builtin
@category Type guard
*/
export function arrayIncludes<Type extends SuperType, SuperType = unknown>(
	array: Type[] | readonly Type[],
	item: SuperType,
	fromIndex?: number,
): item is Type {
	return array.includes(item as Type, fromIndex);
}
