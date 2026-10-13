import type {Absolute, GreaterThan} from 'type-fest';
import type {LiteralNumber} from './internal-types.js';

// Safe integers print without decimal points or exponents, and their magnitude must fit the safe range.
type SafeInteger<T extends number> = T extends unknown
	? `${T}` extends `${bigint}`
		? GreaterThan<Absolute<T>, 9_007_199_254_740_991> extends true ? never : T
		: never
	: never;

/**
A strongly-typed version of `Number.isSafeInteger()`.

@note Numeric literal types are narrowed to integers within the inclusive safe range, from `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER`.

@note Broad numbers, branded numbers, generic inputs, `unknown`, and unions with non-numbers get a boolean result without narrowing.

@note To narrow a union of numeric literals while filtering, use a callback such as `values.filter(value => isSafeInteger(value))`. Passed directly, `.filter(isSafeInteger)` uses the boolean overload and keeps the element type.

@category Improved builtin
@category Type guard
*/
// Boundary: these must stay overloads. A single predicate for a broad `number` would have the input type as its predicate type, and TypeScript then narrows the false branch to `never`, so `if (!isSafeInteger(value))` would break. (v1.3.0 had the opposite problem: `Integer<number>` is `never`, so its true branch was `never`.) The costs, which were tried and rejected: a direct `.filter(isSafeInteger)` cannot narrow a literal union, since TypeScript does not infer a type predicate from an overloaded generic function, and a single signature cannot serve a broad `number` without that `never` or a fake brand in the result. A generic input is not narrowed either: a generic predicate overload is accepted by `not()`, because TypeScript erases an overloaded function's generics when it checks it against a single signature, so `values.filter(not(isSafeInteger))` would compile and return `never[]`. `.filter(value => isSafeInteger(value))` narrows a literal union.
export const isSafeInteger = Number.isSafeInteger as {
	<T extends number>(value: LiteralNumber<T>): value is SafeInteger<T> & LiteralNumber<T>;
	<T>(value: T): boolean;
};
