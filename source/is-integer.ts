import {type Integer} from 'type-fest';

/**
A strongly-typed version of `Number.isInteger()`.

@category Improved builtin
@category Type guard
*/
export const isInteger = Number.isInteger as <T extends number>(value: T) => value is Integer<T>;
