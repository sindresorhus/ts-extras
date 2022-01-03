import {NegativeInfinity, PositiveInfinity} from 'type-fest';

/**
Check whether a value is infinite.

@category Type guard
*/
export function isInfinite(value: unknown): value is NegativeInfinity | PositiveInfinity {
	return !Number.isNaN(value) && !Number.isFinite(value);
}
