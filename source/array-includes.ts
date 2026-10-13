/**
A strongly-typed version of `Array#includes()` that properly acts as a type guard.

When `arrayIncludes` returns `true`, the type is narrowed to the array's element type. When it returns `false`, an `unknown` item stays `unknown`, which is the case this guard is written for. An item typed as a union loses the members that the array's element type covers in the `false` branch. That is not sound when the array does not hold every value of its element type, so check an `unknown` value when that matters.

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
// An item the element type already covers needs no separate element type parameter: the array alone decides it. This overload returns `boolean` because a missing item can still have the array's element type, so the false branch must not exclude that type.
export function arrayIncludes<Type>(
	array: readonly Type[],
	// `NoInfer` keeps the element type decided by the array alone. Inferring it from the item as well would widen it to whatever the item is, and a `unknown` item would then erase the guard.
	item: NoInfer<Type>,
	fromIndex?: number,
): boolean;

// An item not being in the array says nothing about the item's own type, so the `else` branch is left alone whenever the item is wider than the element type, which is the `unknown` case this guard is written for. An item typed as a union the array also holds is narrowed away there.
export function arrayIncludes<Type extends SuperType, SuperType = unknown>(
	array: readonly Type[],
	item: SuperType,
	fromIndex?: number,
): item is Type;

export function arrayIncludes(
	array: readonly unknown[],
	item: unknown,
	fromIndex?: number,
) {
	return array.includes(item, fromIndex);
}
