import type {Split} from 'type-fest';

/**
A strongly-typed version of `String#split()` that returns a tuple for literal strings.

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
): Split<StringType, Delimiter> {
	return string.split(delimiter) as Split<StringType, Delimiter>;
}
