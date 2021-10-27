/**
Asserts that the given value is neither null nor undefined.

@example
```
import {assertDefined} from 'type-extras'

const isDefined: string | null | undefined = 'defined';
assertDefined(isDefined);
//=> string

const isNotDefined: string | null | undefined = null;
assertDefined(isNotDefined);
//=> throws `expected defined value, but got null`;
```
 */
export function assertDefined<T>(maybeDefined: T | null | undefined): asserts maybeDefined is T {
	if (maybeDefined === null || maybeDefined === undefined) {
		throw new TypeError(`expected defined value, but got ${toString.call(maybeDefined)}`);
	}
}
