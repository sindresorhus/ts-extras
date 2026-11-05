// Each member is judged on its own: an empty tuple can never pass, a tuple with a required element already says it is non-empty, and anything else gets a required first element. The member is kept in the intersection, so a readonly array stays readonly and a subtype keeps its own members.
type NonEmpty<Type extends readonly unknown[]> = Type extends unknown
	? Type extends readonly []
		? never
		: Type extends readonly [unknown, ...unknown[]] | readonly [...unknown[], unknown]
			? Type
			: Type & (Type extends unknown[] ? [Type[number], ...Array<Type[number]>] : readonly [Type[number], ...Array<Type[number]>])
	: never;

/**
Check whether an array has at least one element.

Unlike `array.length > 0`, this narrows, so `array[0]` is `T` instead of `T | undefined` with `noUncheckedIndexedAccess`.

@example
```
import {isNonEmpty} from 'ts-extras';

const items: string[] = ['a', 'b'];

if (isNonEmpty(items)) {
	// `string`, not `string | undefined`
	const first = items[0];
	//=> 'a'
}

// Works with tuples
declare const tuple: [] | [string] | [string, number];
if (isNonEmpty(tuple)) {
	// tuple is now typed as [string] | [string, number]
} else {
	// tuple is now typed as []
}
```

@category Type guard
*/
export function isNonEmpty<T extends readonly unknown[]>(array: T): array is NonEmpty<T> {
	return array.length > 0;
}
