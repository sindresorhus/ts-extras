/**
Check whether an array is empty.

This is useful because doing `array.length === 0` on its own won't work as a type-guard.

A type that is not a definite empty tuple can still be empty at runtime, so the true branch keeps the array type with a zero `length`, and stays usable.

@example
```
import {isEmpty} from 'ts-extras';

isEmpty([1, 2, 3]);
//=> false

isEmpty([]);
//=> true

// Works with tuples
const tuple: [string, number] | [] = Math.random() > 0.5 ? ['hello', 42] : [];
if (isEmpty(tuple)) {
	// tuple is now typed as []
} else {
	// tuple is now typed as [string, number]
}
```

@category Type guard
*/
export function isEmpty<T extends readonly unknown[]>(array: T): array is T & {readonly length: 0} {
	return array.length === 0;
}
