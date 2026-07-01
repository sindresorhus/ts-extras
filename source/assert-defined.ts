import {isDefined} from './is-defined.js';

/**
Assert that the given value is defined, meaning it is not `undefined`.

If the value is `undefined`, a helpful `TypeError` will be thrown.

@param message - Custom error message to use instead of the default.

@example
```
import {assertDefined} from 'ts-extras';

const unicorn = 'unicorn';
assertDefined(unicorn);

const notUnicorn = undefined;
assertDefined(notUnicorn);
//=> TypeError: Expected a defined value, got `undefined`

assertDefined(notUnicorn, 'Unicorn is required');
//=> TypeError: Unicorn is required
```

@category Type guard
*/
export function assertDefined<T>(value: T | undefined, message?: string): asserts value is T {
	if (!isDefined(value)) {
		throw new TypeError(message ?? 'Expected a defined value, got `undefined`');
	}
}
