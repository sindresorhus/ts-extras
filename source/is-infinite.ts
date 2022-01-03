import {NegativeInfinity, PositiveInfinity} from 'type-fest';

/**
An symmetric type guard with `isFinite()`

@category Type guard
*/
export function isInfinite(value: unknown): value is NegativeInfinity | PositiveInfinity {
	return !Number.isNaN(value) && !Number.isFinite(value);
}
