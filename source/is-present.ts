/**
Check whether a value is present (non-nullable), meaning it is neither `null` nor `undefined`.

This can be useful as a type guard, as for example, `[1, null].filter(Boolean)` does not always type-guard correctly.

@example
```
import {isPresent} from 'ts-extras';

[1, null, 2, undefined].filter(isPresent);
//=> [1, 2]
```

@category Type guard
*/
export function isPresent<T>(value: T): value is NonNullable<T> {
	return value !== null && value !== undefined;
}
