/**
Assert that the given condition is truthy.

If the condition is falsy, an `Error` will be thrown. Because of the `asserts condition` signature, TypeScript narrows types based on the asserted condition.

@param message - Custom error message, or a function that returns it, called only when the assertion fails.

@example
```
import {assert} from 'ts-extras';

declare function getValue(): string | undefined;

const value = getValue();

assert(value);
// `value` is now of type `string`

assert(value === 'unicorn', 'Expected a unicorn');
//=> Error: Expected a unicorn

assert(value === 'unicorn', () => `Expected a unicorn, got ${value}`);
```

@category Type guard
*/
export function assert(condition: unknown, message?: string | (() => string)): asserts condition {
	if (!condition) { // eslint-disable-line @typescript-eslint/strict-boolean-expressions -- The assertion is about truthiness, like `node:assert`.
		throw new Error((typeof message === 'function' ? message() : message) ?? 'Assertion failed');
	}
}
