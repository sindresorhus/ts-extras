/**
Return the first item of an array with stronger typing for tuples.

This mirrors getting `array[0]` but with better type safety and handling for empty arrays.

@example
```
import {arrayFirst} from 'ts-extras';

const tuple = ['abc', 123, true] as const;
const first = arrayFirst(tuple);
//=> 'abc'
//   ^? 'abc'

const array = ['a', 'b', 'c'];
const maybeFirst = arrayFirst(array);
//=> 'a'
//   ^? string | undefined

// Empty arrays
const empty: string[] = [];
const noFirst = arrayFirst(empty);
//=> undefined
//   ^? string | undefined
```

@category Improved builtin
*/
export function arrayFirst<ArrayType extends readonly unknown[]>(
	array: ArrayType,
): ArrayType extends readonly never[]
	? undefined
	: ArrayType extends readonly [any, ...any[]]
		? ArrayType[0]
		: ArrayType[number] | undefined {
	return array[0] as any;
}
