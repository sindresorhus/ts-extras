import type {Split} from 'type-fest';

/**
A strongly-typed version of `String#split()` that returns a tuple for literal strings.

A regular expression delimiter has no literal form, so the result is `string[]` for one, for a value that is one or the other, and for a limit. Unmatched capturing groups contribute `undefined` entries at runtime, matching the builtin behavior, which the `string[]` type does not describe. Check each piece, or handle the pieces defensively, when the delimiter has capturing groups.

@example
```
import {stringSplit} from 'ts-extras';

const parts = stringSplit('foo-bar-baz', '-');
//=> ['foo', 'bar', 'baz']
//   ^? ['foo', 'bar', 'baz']

const [first, second] = stringSplit('top-left', '-');
//=> first: 'top', second: 'left'

const placement = 'top-start' as const;
const side = stringSplit(placement, '-')[0];
//=> 'top'
//   ^? 'top'

// Dynamic strings return string[]
const dynamic: string = 'a-b-c';
const dynamicParts = stringSplit(dynamic, '-');
//=> string[]
```

@category Improved builtin
*/
export function stringSplit<
	StringType extends string,
	Delimiter extends string,
>(
	string: StringType,
	delimiter: Delimiter,
): Split<StringType, Delimiter>;

// A regular expression is the other thing `String#split()` takes, and a value that is one or the other, an absent delimiter, and a limit are the shapes without a literal form to preserve. None of them can promise a tuple, and all of them read as the builtin's own `string[]`. Most regular expressions have no capturing groups, so an element type with `undefined` would make every such call need a needless guard. An unmatched capturing group contributes an `undefined` entry at runtime, which is a documented limitation.
export function stringSplit(
	string: string,
	delimiter?: string | RegExp,
	limit?: number,
): string[];

export function stringSplit(
	string: string,
	delimiter?: string | RegExp,
	limit?: number,
): unknown[] {
	// Both arguments go to the builtin as they are, in the same positions. An absent separator means the whole string, not a comma, and it is still the first argument, so the limit stays the second one.
	// @ts-expect-error -- The builtin reads an absent separator as "no separator" and takes the limit second, which its type definitions do not declare.
	return string.split(delimiter, limit);
}
