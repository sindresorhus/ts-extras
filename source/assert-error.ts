import {describeValue, isError} from './describe-value.js';

const {toString} = Object.prototype;

// Probing a value can throw, the same as in `isError()`, which applies to naming the value in the failure message too.
function brandOf(value: unknown): string {
	try {
		return toString.call(value);
	} catch {
		return '<unreadable>';
	}
}

/**
Assert that the given value is an `Error`.

If the value is not an `Error`, a helpful `TypeError` will be thrown.

This can be useful as any value could potentially be thrown, but in practice, it's always an `Error`. However, because of this, TypeScript makes the caught error in a try/catch statement `unknown`, which is inconvenient to deal with.

@param message - Custom error message to use instead of the default.

@note Cross-realm errors and objects created with `Object.create(Error.prototype)` are accepted. Objects that only fake the brand with `Symbol.toStringTag` are rejected, and so is a real cross-realm error that sets its own `Symbol.toStringTag`, since the two cannot be told apart.

@example
```
import {assertError} from 'ts-extras';

declare function fetchUnicorns(): Promise<void>;
declare function retry(): void;

async function main() {
	try {
		await fetchUnicorns();
	} catch (error: unknown) {
		assertError(error);

		// `error` is now of type `Error`

		if (error.message === 'Failed to fetch') {
			retry();
			return;
		}

		throw error;
	}
}

assertError('not an error', 'Expected an Error instance');
//=> TypeError: Expected an Error instance
```

@category Type guard
*/
export function assertError(value: unknown, message?: string): asserts value is Error {
	// Cross-realm safe: either a real instance or a genuine Error brand.
	if (isError(value)) {
		return;
	}

	const brand = brandOf(value);
	// A brand of `[object Error]` on a value that is not an `Error` instance means the value set `Symbol.toStringTag`, which is the very signal this function distrusts. Showing it as if it described the value would read as though the value were an error.
	const brandHint = brand === '[object Error]' ? ' (a forged Error brand)' : '';
	throw new TypeError(message ?? `Expected an Error, got ${brand} (${typeof value})${brandHint} → ${describeValue(value)}`);
}
