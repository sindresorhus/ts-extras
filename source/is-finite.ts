import {Finite} from 'type-fest';

/**
An alternative to `Number.isFinite()` that properly acts as a type guard.

@category Improved builtin
@category Type guard
*/
export function isFinite<T extends number>(value: T): value is Finite<T> {
	return Number.isFinite(value);
}
