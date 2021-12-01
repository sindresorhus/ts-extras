import {Integer} from 'type-fest';

/**
An alternative to `Number.isInteger()` that properly acts as a type guard.

@category Improved builtin
@category Type guard
*/
export function isInteger<T extends number>(value: T): value is Integer<T> {
	return Number.isInteger(value);
}
