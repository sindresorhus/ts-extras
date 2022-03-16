/**
An alternative to `Set#has()` that properly acts as a type guard.

It was [rejected](https://github.com/microsoft/TypeScript/issues/42641#issuecomment-774168319) from being done in TypeScript itself.

@example
```
import {setHas} from 'ts-extras';

const values = ['a', 'b', 'c'] as const;
const valueSet = new Set(values);
const valueToCheck: unknown = 'a';

if (setHas(valueSet, valueToCheck)) {
	// We now know that the value is of type `typeof values[number]`.
}
```

@category Improved builtin
@category Type guard
*/
export function setHas<Type extends SuperType, SuperType = unknown>(
	set: ReadonlySet<Type>,
	item: SuperType,
): item is Type {
	return set.has(item as Type);
}
