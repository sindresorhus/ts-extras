const {toString} = Object.prototype;

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

@category Type guard
*/
export function assertError(value: unknown): asserts value is Error {
	if (!(value instanceof Error || toString.call(value) === '[object Error]')) {
		throw new TypeError(`Expected an \`Error\`, got \`${JSON.stringify(value)}\` (${typeof value})`);
	}
}
