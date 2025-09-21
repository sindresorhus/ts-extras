/**
A strongly-typed version of `Array#concat()` that properly handles arrays of different types.

TypeScript's built-in `Array#concat()` has issues with type inference when concatenating arrays of different types or empty arrays. This function provides proper type inference for heterogeneous array concatenation.

Note: This function preserves array holes, matching the native `Array#concat()` behavior.

@example
```
import {arrayConcat} from 'ts-extras';

const strings = ['a', 'b'];
const numbers = [1, 2];

// TypeScript's built-in concat would error here
const mixed = arrayConcat(strings, numbers);
//=> ['a', 'b', 1, 2]
//   ^? (string | number)[]

// Works with tuples
const tuple = arrayConcat(['x'] as const, [1] as const);
//=> ['x', 1]
//   ^? (1 | 'x')[]

// Handles empty arrays correctly
const withEmpty = arrayConcat([], ['hello']);
//=> ['hello']
//   ^? string[]
```

@category Improved builtin
*/

// Single array case - preserve tuple structure when possible
export function arrayConcat<T extends readonly unknown[]>(
	array: T,
): T extends ReadonlyArray<infer U> ? U[] : never;

// Unlimited arrays using variadic tuple types and recursive conditional types
export function arrayConcat<
	T extends readonly unknown[],
	U extends ReadonlyArray<readonly unknown[]>,
>(
	array: T,
	...items: U
): ArrayConcatUnlimited<T, U> extends ReadonlyArray<infer R> ? R[] : unknown[];
export function arrayConcat(
	array: readonly unknown[],
	...items: ReadonlyArray<readonly unknown[]>
): unknown[] {
	// Use native concat to preserve holes (flat() would drop them)
	return Array.prototype.concat.call(array, ...items);
}

// Helper type for recursive concatenation of unlimited arrays
type ArrayConcatUnlimited<
	First extends readonly unknown[],
	Rest extends ReadonlyArray<readonly unknown[]>,
> = Rest extends readonly [
	infer Next extends readonly unknown[],
	...infer Remaining extends ReadonlyArray<readonly unknown[]>,
]
	? ArrayConcatUnlimited<[...First, ...Next], Remaining>
	: First;
