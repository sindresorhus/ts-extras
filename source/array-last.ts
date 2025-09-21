import type {LastArrayElement} from 'type-fest';

/**
Return the last item of an array with stronger typing for tuples.

This provides better type safety than `array[array.length - 1]` or `array.at(-1)`.

@example
```
import {arrayLast} from 'ts-extras';

const tuple = ['abc', 123, true] as const;
const last = arrayLast(tuple);
//=> true
//   ^? true

const array = ['a', 'b', 'c'];
const maybeLast = arrayLast(array);
//=> 'c'
//   ^? string | undefined

// Empty arrays
const empty: string[] = [];
const noLast = arrayLast(empty);
//=> undefined
//   ^? string | undefined
```

@category Improved builtin
*/
export function arrayLast<const ArrayType extends readonly [...unknown[], unknown]>(array: ArrayType): LastArrayElement<ArrayType>;
export function arrayLast<ArrayType extends readonly unknown[]>(array: ArrayType): ArrayType[number] | undefined;
export function arrayLast(array: readonly unknown[]) {
	return array.at(-1);
}
