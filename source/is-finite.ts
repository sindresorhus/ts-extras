import {type Finite} from 'type-fest';

/**
An alternative to `Number.isFinite()` that properly acts as a type guard.

@category Improved builtin
@category Type guard
*/
export const isFinite = Number.isFinite as <T extends number>(value: T) => value is Finite<T>;
