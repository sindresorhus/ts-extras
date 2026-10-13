import {type Integer} from 'type-fest';
import type {LiteralNumber} from './internal-types.js';

/**
A strongly-typed version of `Number.isInteger()`.

@note Only numeric literals and unions of numeric literals are narrowed. A broad `number`, branded number, generic input, `unknown`, or union with non-numbers gets a boolean result without narrowing, so both reachable branches remain usable.

@note To narrow a union of numeric literals while filtering, use a callback such as `values.filter(value => isInteger(value))`. Passed directly, `.filter(isInteger)` uses the boolean overload and keeps the element type.

@category Improved builtin
@category Type guard
*/
// Boundary: these must stay overloads. A single predicate for a broad `number` would have the input type as its predicate type, and TypeScript then narrows the false branch to `never`, so `if (!isInteger(value))` would break. (v1.3.0 had the opposite problem: `Integer<number>` is `never`, so its true branch was `never`.) The costs, which were tried and rejected: a direct `.filter(isInteger)` cannot narrow a literal union, since TypeScript does not infer a type predicate from an overloaded generic function, and a single signature cannot serve a broad `number` without that `never` or a fake brand in the result. A generic input is not narrowed either: a generic predicate overload is accepted by `not()`, because TypeScript erases an overloaded function's generics when it checks it against a single signature, so `values.filter(not(isInteger))` would compile and return `never[]`. `.filter(value => isInteger(value))` narrows a literal union.
export const isInteger = Number.isInteger as {
	<T extends number>(value: LiteralNumber<T>): value is Integer<T> & LiteralNumber<T>;
	<T>(value: T): boolean;
};
