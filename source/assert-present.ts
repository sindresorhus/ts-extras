import {isPresent} from './is-present.js';

/**
Assert that the given value is present (non-nullable), meaning it is neither `null` nor `undefined`.

If the value is not present (`undefined` or `null`), a helpful `TypeError` will be thrown.

@param message - Custom error message to use instead of the default, or a function that returns it, called only when the assertion fails.

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

// The message function is only called when the assertion fails, so it can do costly work.
declare const unicorns: Map<string, string>;
const unicornName = 'rainbow';
assertPresent(unicorns.get(unicornName), () => `No unicorn named ${unicornName}, only ${[...unicorns.keys()].join(', ')}`);
```

@category Type guard
*/
export function assertPresent<T>(value: T, message?: string | (() => string)): asserts value is NonNullable<T> {
	if (!isPresent(value)) {
		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		throw new TypeError((typeof message === 'function' ? message() : message) ?? `Expected a present value, got \`${value}\``);
	}
}
