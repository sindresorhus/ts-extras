import {type Finite} from 'type-fest';
import type {LiteralNumber} from './internal-types.js';

/**
A strongly-typed version of `Number.isFinite()`.

@note Only infinity members are removed from numeric literal types, so `Finite<1 | 2>` is `1 | 2`. A broad `number`, branded number, generic input, `unknown`, or union with non-numbers gets a boolean result without narrowing, so both reachable branches remain usable.

@note To narrow a union of numeric literals while filtering, use a callback such as `values.filter(value => isFinite(value))`. Passed directly, `.filter(isFinite)` uses the boolean overload and keeps the element type.

@category Improved builtin
@category Type guard
*/
// Boundary: these must stay overloads. A single predicate for a broad `number` would have the input type as its predicate type, and TypeScript then narrows the false branch to `never`, so `if (!isFinite(value))` would break, as it did in v1.3.0. The costs, which were tried and rejected: a direct `.filter(isFinite)` cannot narrow a literal union, since TypeScript does not infer a type predicate from an overloaded generic function, and a single signature cannot serve a broad `number` without that `never` or a fake brand in the result. A generic input is not narrowed either: a generic predicate overload is accepted by `not()`, because TypeScript erases an overloaded function's generics when it checks it against a single signature, so `values.filter(not(isFinite))` would compile and return `never[]`. `.filter(value => isFinite(value))` narrows a literal union.
export const isFinite = Number.isFinite as {
	<T extends number>(value: LiteralNumber<T>): value is Finite<T> & LiteralNumber<T>;
	<T>(value: T): boolean;
};
