import type {GreaterThanOrEqual, IsUnion} from 'type-fest';

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

// A minimum that names one non-negative integer. A wide `number`, a union, a negative, or a fraction cannot say which elements are required, so it gets a plain boolean. So does a minimum of 1000 or more, since building a tuple that long exceeds TypeScript's recursion limit.
type MinimumLength<Minimum extends number> = number extends Minimum
	? never
	: IsUnion<Minimum> extends true
		? never
		: `${Minimum}` extends `-${string}` | `${Digit}${Digit}${Digit}${Digit}${string}`
			? never
			: `${Minimum}` extends `${bigint}` ? Minimum : never;

// Each required element is read from its own position, so a tuple with a rest element, such as `[string, ...number[]]`, keeps `string` first and `number` after it.
type RequiredElements<Type extends readonly unknown[], Length extends number, Result extends unknown[] = []> = Result['length'] extends Length
	? Result
	: RequiredElements<Type, Length, [...Result, Type[Result['length']]]>;

// Each member is judged on its own. A fixed-length tuple is kept when every length it can have reaches the minimum, and dropped when none does. Anything else, a tuple with optional elements that only sometimes reach it or one with a rest element, gets the required elements, intersected with the member, so a readonly array stays readonly, a tuple keeps its own element types, and the member stays in the false branch, which a shorter value takes.
type AtLeast<Type extends readonly unknown[], Minimum extends number> = Type extends unknown
	? number extends Type['length']
		? Type & WithRequiredElements<Type, Minimum>
		: GreaterThanOrEqual<Type['length'], Minimum> extends true
			? Type
			: GreaterThanOrEqual<Type['length'], Minimum> extends false ? never : Type & WithRequiredElements<Type, Minimum>
	: never;

type WithRequiredElements<Type extends readonly unknown[], Minimum extends number> = Type extends unknown[]
	? [...RequiredElements<Type, Minimum>, ...Array<Type[number]>]
	: readonly [...RequiredElements<Type, Minimum>, ...Array<Type[number]>];

/**
Check whether an array has at least the given number of elements.

This narrows the array to a tuple with that many required elements, so they can be read or destructured without `undefined` under `noUncheckedIndexedAccess`.

@example
```
import {hasAtLeast} from 'ts-extras';

const parts = 'user:admin'.split(':');

if (hasAtLeast(parts, 2)) {
	// `string`, not `string | undefined`
	const [name, role] = parts;
	//=> 'user', 'admin'
}
```

@note Only a minimum that is one non-negative integer literal below 1000 narrows. A wide `number`, a union, a negative, a fraction, or a larger minimum gives a plain `boolean`.

@note A tuple with an optional element keeps that element optional in the true branch, so reading it can still give `undefined`.

@category Type guard
*/
export function hasAtLeast<Type extends readonly unknown[], Minimum extends number>(
	array: Type,
	minimum: Minimum & MinimumLength<Minimum>,
): array is AtLeast<Type, Minimum>;

export function hasAtLeast(array: readonly unknown[], minimum: number): boolean;

export function hasAtLeast(array: readonly unknown[], minimum: number): boolean {
	return array.length >= minimum;
}
