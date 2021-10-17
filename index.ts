import {Mutable} from 'type-fest';

const {toString} = Object.prototype;

/**
Check whether a value is defined (non-nullable), meaning it is neither `null` or `undefined`.

This can be useful as a type guard, as for example, `[1, null].filter(Boolean)` does not always type-guard correctly.

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
Assert that the given value is an `Error`.

If the value is not an `Error`, a helpful `TypeError` will be thrown.

This can be useful as any value could potentially be thrown, but in practice, it's always an `Error`. However, because of this, TypeScript makes the caught error in a try/catch statement `unknown`, which is inconvenient to deal with.

@example
```
import {assertError} from 'ts-extras';

try {
	fetchUnicorns();
} catch (error: unknown) {
	assertError(error)

	// `error` is now of type `Error`

	if (error.message === 'Failed to fetch') {
		retry();
		returnl
	}

	throw error;
}
```
*/
export function assertError(value: unknown): asserts value is Error {
	if (!(value instanceof Error || toString.call(value) === '[object Error]')) {
		throw new TypeError(`Expected an \`Error\`, got \`${JSON.stringify(value)}\` (${typeof value})`);
	}
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

/**
Check whether an array is empty.

This is useful because doing `array.length === 0` on its own won't work as a type-guard.

@example
```
import {isEmpty} from 'ts-extras';

isEmpty([1, 2, 3]);
//=> false

isEmpty([]);
//=> true
```
*/
// eslint-disable-next-line @typescript-eslint/ban-types
export function isEmpty(array: readonly unknown[]): array is [] {
	return array.length === 0;
}
