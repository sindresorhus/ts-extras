import type {LastArrayElement} from 'type-fest';

/**
A strongly-typed version of `Array#at()` with improved tuple support (supports `-1` and positive literal indices for tuples).

This mirrors the runtime behavior of `Array#at()` and returns `undefined` for out-of-bounds indices. For tuples, a negative index of `-1` resolves to the tuple’s last element type. Positive literal indices for tuples resolve to the corresponding element type.

@note For a tuple, a negative index other than `-1` or a fractional index returns the union of all element types.

@example
```
import {arrayAt} from 'ts-extras';

const tuple = ['abc', 123, true] as const;
const last = arrayAt(tuple, -1);
//=> true
//   ^? true | undefined

const first = arrayAt(tuple, 0);
//=> 'abc'
//   ^? 'abc' | undefined

const array = ['a', 'b', 'c'];
const maybeItem = arrayAt(array, -1);
//=> 'c'
//   ^? string | undefined
```

@category Improved builtin
*/
export function arrayAt<ArrayType extends readonly unknown[], Index extends number>(
	array: ArrayType,
	index: Index,
): ArrayAtResult<ArrayType, Index> {
	return (array as readonly unknown[]).at(index) as ArrayAtResult<ArrayType, Index>;
}

type ArrayAtResult<ArrayType extends readonly unknown[], Index extends number> =
	number extends Index
		? ArrayType[number] | undefined
		// A tuple with a leading or middle rest has a `number` length, so this has to come before the length check below. For a plain array the last element type is the element type, so nothing is lost by answering it here.
		: Index extends -1
			? LastArrayElement<ArrayType> | undefined
			: `${Index}` extends `${bigint}`
				? number extends ArrayType['length']
					? ArrayType[number] | undefined
					: Index extends keyof ArrayType
						? ArrayType[Index] | undefined
						: ArrayType[number] | undefined
				// `Array#at()` truncates a fractional index toward zero, so `at(1.5)` reads index `1`. Indexing a tuple with a non-integer answers `undefined` in the type system, which is the one member that cannot be there, so the whole element union is the honest answer. Checking integer spelling also handles tiny fractions like `1e-7`.
				: ArrayType[number] | undefined;
