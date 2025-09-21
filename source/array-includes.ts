/**
A strongly-typed version of `Array#includes()` that properly acts as a type guard.

When `arrayIncludes` returns `true`, the type is narrowed to the array's element type.
When it returns `false`, the type remains unchanged (i.e., `unknown` stays `unknown`).

It was [rejected](https://github.com/microsoft/TypeScript/issues/26255#issuecomment-748211891) from being done in TypeScript itself.

@example
```
import {arrayIncludes} from 'ts-extras';

const values = ['a', 'b', 'c'] as const;
const valueToCheck: unknown = 'a';

if (arrayIncludes(values, valueToCheck)) {
	// We now know that the value is of type `typeof values[number]`.
} else {
	// The value remains `unknown`.
}
```

@category Improved builtin
@category Type guard
*/
export function arrayIncludes<Type extends SuperType, SuperType = unknown>(
	array: readonly Type[],
	item: SuperType,
	fromIndex?: number,
	// The `& {}` prevents TypeScript from narrowing the type in the `else` branch,
	// since an item not being in the array doesn't mean it isn't of that type.
): item is Type & {} {
	return array.includes(item as Type, fromIndex);
}
