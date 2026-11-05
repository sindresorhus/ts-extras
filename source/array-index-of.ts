/**
A strongly-typed version of `Array#indexOf()` that accepts an item wider than the array's element type.

The builtin rejects an `unknown` item, or a `string` for an array of string literals. An item of an unrelated type, such as a number for an array of strings, is still rejected.

@example
```
import {arrayIndexOf} from 'ts-extras';

const levels = ['debug', 'info', 'warn'] as const;
const level: string = 'info';

const index = arrayIndexOf(levels, level);
//=> 1
//   ^? number
```

@category Improved builtin
*/
// An item the element type already covers needs no separate type parameter: the array alone decides it.
export function arrayIndexOf<Type>(
	array: readonly Type[],
	// `NoInfer` keeps the element type decided by the array alone, so the item cannot widen it.
	item: NoInfer<Type>,
	fromIndex?: number,
): number;

// An item wider than the element type, such as `unknown`. An item that shares nothing with the element type is rejected, since it can never be found.
export function arrayIndexOf<Type extends SuperType, SuperType = unknown>(
	array: readonly Type[],
	item: SuperType,
	fromIndex?: number,
): number;

export function arrayIndexOf(
	array: readonly unknown[],
	item: unknown,
	fromIndex?: number,
): number {
	return array.indexOf(item, fromIndex);
}
