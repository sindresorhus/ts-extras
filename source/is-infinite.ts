import {type NegativeInfinity, type PositiveInfinity} from 'type-fest';

/**
Check whether a value is infinite.

@example
```
import {isInfinite} from 'ts-extras';

isInfinite(Number.POSITIVE_INFINITY);
//=> true

isInfinite(Number.NEGATIVE_INFINITY);
//=> true

isInfinite(42);
//=> false

isInfinite(Number.NaN);
//=> false
```

@category Type guard
*/
export function isInfinite(value: unknown): value is NegativeInfinity | PositiveInfinity {
	return !Number.isNaN(value) && !Number.isFinite(value);
}
