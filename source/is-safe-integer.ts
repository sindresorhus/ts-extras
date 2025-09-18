import {type Integer} from 'type-fest';

/**
A strongly-typed version of `Number.isSafeInteger()`.

@category Improved builtin
@category Type guard
*/
export const isSafeInteger = Number.isSafeInteger as <T extends number>(value: T) => value is Integer<T>;
