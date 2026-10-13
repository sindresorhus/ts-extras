/**
A strongly-typed version of `Array#concat()` that properly handles arrays of different types.

TypeScript's built-in `Array#concat()` has issues with type inference when concatenating arrays of different types or empty arrays. This function provides proper type inference for heterogeneous array concatenation. A scalar argument is appended as a single element, which is what the native does with one. A non-primitive is not accepted, because an object carrying `Symbol.isConcatSpreadable` is spread instead, and the native's own parameter type excludes that shape too.

Note: This function preserves array holes, matching the native `Array#concat()` behavior.

@note Custom `Symbol.isConcatSpreadable` and `Symbol.species` behavior is unsupported by the types.

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
//   ^? Array<1 | 'x'>

// A single tuple keeps its shape.
const single = arrayConcat(['x', 1] as const);
//=> ['x', 1]
//   ^? ['x', 1]

// Handles empty arrays correctly
const withEmpty = arrayConcat([], ['hello']);
//=> ['hello']
//   ^? string[]
```

@category Improved builtin
*/

// Single array case. Spreading the type keeps tuple elements without promising custom properties that concat does not copy.
export function arrayConcat<T extends readonly unknown[]>(
	array: T,
): [...T];

// Unlimited arrays using the union of their element types. A scalar item is appended as a single element, which is what `Array#concat()` does with one. A non-primitive is not accepted: `Array#concat()` spreads an object carrying `Symbol.isConcatSpreadable` instead of appending it, so the result would not be one element. The native's own parameter type excludes that shape too.
export function arrayConcat<
	T extends readonly unknown[],
	U extends readonly ConcatItem[],
>(
	array: T,
	...items: U
): Array<T[number] | ConcatElement<U[number]>>;
export function arrayConcat(
	array: readonly unknown[],
	...items: readonly unknown[]
): unknown[] {
	// Use native concat to preserve holes (flat() would drop them)
	return Array.prototype.concat.call(array, ...items) as unknown[];
}

// What `Array#concat()` takes: another array, or a scalar it appends as one element.
type ConcatItem = readonly unknown[] | string | number | bigint | boolean | symbol | null | undefined;

// A distributive conditional gets the element of each array argument and keeps each scalar argument as-is, including arguments passed through a dynamic spread.
type ConcatElement<Item> = Item extends readonly unknown[] ? Item[number] : Item;
