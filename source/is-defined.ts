/**
Check whether a value is defined (non-nullable), meaning it is neither `null` or `undefined`.

This can be useful as a type guard, as for example, `[1, null].filter(Boolean)` does not always type-guard correctly.

@example
```
import {isDefined} from 'ts-extras';

[1, null, 2, undefined].filter(isDefined);
//=> [1, 2]
```

@category Type guard
*/
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}
