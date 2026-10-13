/**
Assert that the given condition is truthy.

If the condition is falsy, an `Error` will be thrown. Because of the `asserts condition` signature, TypeScript narrows types based on the asserted condition.

@param message - Custom error message to use instead of the default.

@example
```
import {assert} from 'ts-extras';

declare function getValue(): string | undefined;

const value = getValue();

assert(value);
// `value` is now of type `string`

assert(value === 'unicorn', 'Expected a unicorn');
//=> Error: Expected a unicorn
```

@category Type guard
*/
export function assert(condition: unknown, message?: string): asserts condition {
	if (!condition) { // eslint-disable-line @typescript-eslint/strict-boolean-expressions -- The assertion is about truthiness, like `node:assert`.
		throw new Error(message ?? 'Assertion failed');
	}
}
