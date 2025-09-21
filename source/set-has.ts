/**
A strongly-typed version of `Set#has()` that properly acts as a type guard.

When `setHas` returns `true`, the type is narrowed to the set's element type.
When it returns `false`, the type remains unchanged (i.e., `unknown` stays `unknown`).

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
export function setHas<Type extends SuperType, SuperType = unknown>(
	set: ReadonlySet<Type>,
	item: SuperType,
	// The `& {}` prevents TypeScript from narrowing the type in the `else` branch,
	// since an item not being in the set doesn't mean it isn't of that type.
	// eslint-disable-next-line @typescript-eslint/ban-types
): item is Type & {} {
	return set.has(item as Type);
}
