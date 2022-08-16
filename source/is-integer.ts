import {Integer} from 'type-fest';

/**
An alternative to `Number.isInteger()` that properly acts as a type guard.

@category Improved builtin
@category Type guard
*/
export const isInteger = Number.isInteger as <T extends number>(value: T) => value is Integer<T>;
