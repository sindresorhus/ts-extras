import type {IsEqual} from 'type-fest';

/**
Check if two types are equal at compile time.

Returns a boolean type (`true` or `false`) at compile time based on whether the types are equal.
At runtime, this returns nothing (`void`) since it's purely a compile-time utility.

@example
```
import {isEqualType} from 'ts-extras';

// Type-level comparison
const result1 = isEqualType<string, string>(); // Type: true
const result2 = isEqualType<string, number>(); // Type: false

// Value-level comparison
const string1 = 'hello';
const string2 = 'world';
const number = 42;
const result3 = isEqualType(string1, string2); // Type: true (both strings)
const result4 = isEqualType(string1, number);  // Type: false (different types)
```

@note The runtime value is `void`. This function is designed for compile-time type checking only, not runtime behavior.

@category Type guard
*/

// Type-level comparison: Check if two types are equal at compile time
export function isEqualType<A, B>(): IsEqual<A, B>;

// Value-level comparison: Check if two values have the same type
export function isEqualType<A, B>(
	a: A,
	b: B,
): IsEqual<A, B>;

// Implementation overload
export function isEqualType<A, B>(): IsEqual<A, B> {
	// This is a compile-time utility - runtime returns nothing
	// The actual type checking happens at the TypeScript level
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return undefined as any;
}
