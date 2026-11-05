/**
A strongly-typed version of `Array#lastIndexOf()` that accepts an item wider than the array's element type.

The builtin rejects an `unknown` item, or a `string` for an array of string literals. An item of an unrelated type, such as a number for an array of strings, is still rejected.

@example
```
import {arrayLastIndexOf} from 'ts-extras';

const steps = ['build', 'test', 'build'] as const;
const step: string = 'build';

const index = arrayLastIndexOf(steps, step);
//=> 2
//   ^? number
```

@category Improved builtin
*/
// An item the element type already covers needs no separate type parameter: the array alone decides it.
export function arrayLastIndexOf<Type>(
	array: readonly Type[],
	// `NoInfer` keeps the element type decided by the array alone, so the item cannot widen it.
	item: NoInfer<Type>,
	fromIndex?: number,
): number;

// An item wider than the element type, such as `unknown`. An item that shares nothing with the element type is rejected, since it can never be found.
export function arrayLastIndexOf<Type extends SuperType, SuperType = unknown>(
	array: readonly Type[],
	item: SuperType,
	fromIndex?: number,
): number;

export function arrayLastIndexOf(
	array: readonly unknown[],
	item: unknown,
	...fromIndex: [number?]
): number {
	// An explicit `undefined` is read as index `0`, which searches only the first element, so preserve whether `fromIndex` was passed.
	return array.lastIndexOf(item, ...fromIndex);
}
