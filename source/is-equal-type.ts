import type {IsEqual} from 'type-fest';

/**
A utility to ensure type correctness at compile time. Useful for testing and type verification.

This function provides type-level type equality checking using type-fest's IsEqual type.
The main purpose is compile-time type checking - runtime behavior is not the focus.

@example
```
import {isEqualType} from 'ts-extras';

// Type-level comparison - returns true/false type at compile time
const result1 = isEqualType<string, string>(); // Type: true
const result2 = isEqualType<string, number>(); // Type: false

// Value-level comparison - checks if two values have the same type
const string1 = 'hello';
const string2 = 'world';
const number = 42;
const result3 = isEqualType(string1, string2); // Type: true (both strings)
const result4 = isEqualType(string1, number);  // Type: false (different types)

// For runtime behavior, use with type assertions or conditional types
type CheckResult<T, U> = IsEqual<T, U> extends true ? 'match' : 'no-match';
```

@category Type guard
*/

// Type-level comparison: Check if two types are equal at compile time
export function isEqualType<A, B>(): IsEqual<A, B>;

// Value-level comparison: Check if two values have the same type
export function isEqualType<A, B>(
	a: A,
	b: B,
): IsEqual<A, B>;

// Implementation
export function isEqualType<A, B>(...arguments_: [A, B] | []): any {
	// This is primarily a compile-time utility
	// Runtime always returns true for simplicity
	if (arguments_.length === 0) {
		return true as any;
	}

	return true as any;
}