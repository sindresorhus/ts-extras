/**
Assert that a code path is unreachable.

Use this in the `default` case of a `switch` statement (or the final `else` of an `if`/`else if` chain) to get a compile-time error if a new variant is added to a union type but not handled.

If called at runtime (which should never happen), it throws an `Error` with the unexpected value.

@example
```
import {assertNever} from 'ts-extras';

type Status = 'idle' | 'loading' | 'success' | 'error';

function render(status: Status): string {
	switch (status) {
		case 'idle': {
			return 'Idle';
		}
		case 'loading': {
			return 'Loading...';
		}
		case 'success': {
			return 'Done';
		}
		case 'error': {
			return 'Failed';
		}
		default: {
			return assertNever(status);
		}
	}
}
```

@category Type guard
*/
export function assertNever(value: never): never {
	throw new Error(`Unreachable: \`${describeValue(value)}\``);
}

function describeValue(value: unknown): string {
	// Runtime misuse should still produce an Error even for values that cannot be string-coerced directly.
	try {
		return String(value);
	} catch {
		try {
			return Object.prototype.toString.call(value);
		} catch {
			return '<Unprintable value>';
		}
	}
}
