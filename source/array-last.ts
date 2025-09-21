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
export function arrayLast<ArrayType extends readonly unknown[]>(
	array: ArrayType,
): ArrayType extends readonly never[]
		? undefined
		: ArrayType extends readonly [...any[], infer Last]
			? Last
			: LastArrayElement<ArrayType> | undefined {
	if (array.length === 0) {
		return undefined as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
	}

	return array.at(-1) as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
}
