/**
A strongly-typed version of `Set#has()` that properly acts as a type guard.

When `setHas` returns `true`, the type is narrowed to the set's element type. When it returns `false`, an `unknown` item stays `unknown`, which is the case this guard is written for. An item typed as a union loses the members that the set's element type covers in the `false` branch. That is not sound when the set does not hold every value of its element type, so check an `unknown` value when that matters.

It was [rejected](https://github.com/microsoft/TypeScript/issues/42641#issuecomment-774168319) from being done in TypeScript itself.

@example
```
import {setHas} from 'ts-extras';

const values = ['a', 'b', 'c'] as const;
const valueSet = new Set(values);
const valueToCheck: unknown = 'a';

if (setHas(valueSet, valueToCheck)) {
	// We now know that the value is of type `typeof values[number]`.
} else {
	// The value remains `unknown`.
}
```

@category Improved builtin
@category Type guard
*/
// An item the element type already covers needs no separate element type parameter: the set alone decides it. This overload returns `boolean` because a missing item can still have the set's element type, so the false branch must not exclude that type.
export function setHas<Type>(
	set: ReadonlySet<Type>,
	// `NoInfer` keeps the element type decided by the set alone. Inferring it from the item as well would widen it to whatever the item is, and a `unknown` item would then erase the guard.
	item: NoInfer<Type>,
): boolean;

// An item not being in the set says nothing about the item's own type, so the `else` branch is left alone whenever the item is wider than the element type, which is the `unknown` case this guard is written for. An item typed as a union the set also holds is narrowed away there.
export function setHas<Type extends SuperType, SuperType = unknown>(
	set: ReadonlySet<Type>,
	item: SuperType,
): item is Type;

export function setHas(set: ReadonlySet<unknown>, item: unknown) {
	return set.has(item);
}
