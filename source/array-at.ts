import type {LastArrayElement} from 'type-fest';

/**
Return the item at the given index like `Array#at()`, but with stronger typing for tuples. Supports `-1` on tuples.

This mirrors the runtime behavior of `Array#at()` and returns `undefined` for out-of-bounds indices. For tuples, a negative index of `-1` resolves to the tuple’s last element type. Positive literal indices for tuples resolve to the corresponding element type.

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
		: number extends ArrayType['length']
			? ArrayType[number] | undefined
			: Index extends -1
				? LastArrayElement<ArrayType> | undefined
				: Index extends keyof ArrayType
					? ArrayType[Index] | undefined
					: ArrayType[number] | undefined;
