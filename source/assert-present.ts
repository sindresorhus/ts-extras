import {isPresent} from './is-present.js';

/**
Assert that the given value is present (non-nullable), meaning it is neither `null` nor `undefined`.

If the value is not present (`undefined` or `null`), a helpful `TypeError` will be thrown.

@param message - Custom error message to use instead of the default.

@example
```
import {assertPresent} from 'ts-extras';

const unicorn = 'unicorn';
assertPresent(unicorn);

const notUnicorn = null;
assertPresent(notUnicorn);
//=> TypeError: Expected a present value, got `null`

assertPresent(notUnicorn, 'Unicorn is required');
//=> TypeError: Unicorn is required
```

@category Type guard
*/
export function assertPresent<T>(value: T, message?: string): asserts value is NonNullable<T> {
	if (!isPresent(value)) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw new TypeError(message ?? `Expected a present value, got \`${value}\``);
	}
}
