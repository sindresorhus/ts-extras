import {type Finite} from 'type-fest';

/**
A strongly-typed version of `Number.isFinite()`.

@category Improved builtin
@category Type guard
*/
export const isFinite = Number.isFinite as <T extends number>(value: T) => value is Finite<T>;
