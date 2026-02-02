import type {Join} from 'type-fest';

/**
A strongly-typed version of `Array#join()` that preserves literal string types.

The built-in `Array#join()` always returns `string`, losing type information. This function returns a properly-typed template literal when given a tuple of literals.

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
export function arrayJoin<
	const Items extends readonly (string | number | bigint | boolean | null | undefined)[],
	Delimiter extends string,
>(
	array: Items,
	delimiter: Delimiter,
): Join<Items, Delimiter> {
	return array.join(delimiter) as Join<Items, Delimiter>;
}
