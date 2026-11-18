import {isDefined} from './is-defined.js';

/**
Assert that the given value is defined, meaning it is not `undefined`.

If the value is `undefined`, a helpful `TypeError` will be thrown.

@param message - Custom error message to use instead of the default, or a function that returns it, called only when the assertion fails.

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

// The message function is only called when the assertion fails, so it can do costly work.
declare const unicorns: Map<string, string>;
const unicornName = 'rainbow';
assertDefined(unicorns.get(unicornName), () => `No unicorn named ${unicornName}, only ${[...unicorns.keys()].join(', ')}`);
```

@category Type guard
*/
export function assertDefined<T>(value: T | undefined, message?: string | (() => string)): asserts value is T & ({} | null) {
	if (!isDefined(value)) {
		throw new TypeError((typeof message === 'function' ? message() : message) ?? 'Expected a defined value, got `undefined`');
	}
}
