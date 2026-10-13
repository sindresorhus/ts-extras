import type {IsUnion, Join} from 'type-fest';

type Joined<
	Items extends ReadonlyArray<string | number | bigint | boolean | null | undefined>,
	Delimiter extends string,
> = Items extends unknown
	// Each member of a union of tuples is joined on its own, so `['a', 'b'] | ['c']` gives `'a-b' | 'c'`. Checking the length of the whole union would mistake two fixed lengths for an optional element.
	? number extends Items['length']
		// A rest element, and a plain array, both have a `number` length, so `Join` would read the shape as fixed and promise delimiters the runtime never writes: `['a']` joins to `'a'`, which is not in `` `a-${string}` ``.
		? string
		: IsUnion<Items['length']> extends true
			// A tuple with an optional element has more than one length, so the runtime joins only the elements that are there. `Join` reads the missing one as an empty string, which promises a trailing delimiter for a value that has none.
			? string
			: Join<Items, Delimiter>
	: never;

/**
A strongly-typed version of `Array#join()` that preserves literal string types.

The built-in `Array#join()` always returns `string`, losing type information. This function returns a properly-typed template literal when given a tuple of literals.

The separator is optional, since the builtin defaults it to a comma and the pieces are then still known exactly. An element with no literal form, such as a `Date` or any object, is accepted the way the builtin accepts it and contributes nothing to the result, which is then a plain `string`. A `Symbol` element is the one thing the builtin cannot stringify, and a call holding one at the top level is rejected; one nested inside an array element is not detected and still throws, as it does for the builtin. A `number` element gives a `` `${number}` `` template, as it does in a TypeScript template literal, so `NaN` and the infinities produce text outside the type. An optional element and a rest element are the same: `['a', 'b'?]` and `['a', ...'b'[]]` are both answered by a plain `string`, because the runtime joins only the elements that are there.

@example
```
import {arrayJoin} from 'ts-extras';

// Literal types are preserved automatically
const joined = arrayJoin(['foo', 'bar', 'baz'], '-');
//=> 'foo-bar-baz'
//   ^? 'foo-bar-baz'

const dotPath = arrayJoin(['a', 'b', 'c'], '.');
//=> 'a.b.c'
//   ^? 'a.b.c'

// Dynamic arrays return string
const dynamic: string[] = ['a', 'b'];
const dynamicJoined = arrayJoin(dynamic, '-');
//=> string
```

@category Improved builtin
*/
// `Array#join()` defaults its separator to a comma, and the pieces are then still known exactly, so the same literal answer comes out of an argument that is simply not there.
export function arrayJoin<
	const Items extends ReadonlyArray<string | number | bigint | boolean | null | undefined>,
>(
	array: Items,
	delimiter?: undefined,
): Joined<Items, ','>;

export function arrayJoin<
	const Items extends ReadonlyArray<string | number | bigint | boolean | null | undefined>,
	Delimiter extends string,
>(
	array: Items,
	delimiter: Delimiter,
): Joined<Items, Delimiter>;

// `Array#join()` runs every element through `String()`, so a `Date`, an array, or any object with a `toString` is accepted, and none of them has a literal form to preserve, so there is no tuple to promise either. A `Symbol` *element* is the one thing it cannot stringify, so an array holding one at the top level is rejected, matching what the builtin does at runtime. A `Symbol` nested inside an array element is not detected, and still throws at runtime, as it does for the builtin.
export function arrayJoin<Items extends readonly unknown[]>(
	array: Items & ReadonlyArray<Exclude<Items[number], symbol>>,
	delimiter?: string,
): string;

export function arrayJoin(
	array: readonly unknown[],
	delimiter = ',',
): string {
	return array.join(delimiter);
}
