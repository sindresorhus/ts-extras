import {Mutable} from 'type-fest';

/**
Check whether a value is defined (non-nullable), meaning it is neither `null` or `undefined`.

This can be useful as a type-guard, as for example, `[1, null].filter(Boolean)` does not always type-guard correctly.

@example
```
import {isDefined} from 'ts-extras';

[1, null, 2, undefined].filter(isDefined);
//=> [1, 2]
```
*/
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
Cast the given value to be [`Mutable`](https://github.com/sindresorhus/type-fest/blob/main/source/mutable.d.ts).

This is useful because of a TypeScript limitation: https://github.com/microsoft/TypeScript/issues/45618#issuecomment-908072756

@example
```
import {asMutable} from 'ts-extras';

const mutableContext = asMutable((await import('x')).context);
```
*/
export function asMutable<T>(value: T): Mutable<T> {
	return value;
}
