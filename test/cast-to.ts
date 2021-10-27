import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {castTo} from '../source/index.js';

test('castTo()', t => {
	const curryAdd = (foo: number) => (bar: number): number => foo + bar;

	const add = castTo<(a: number, b: number) => number>(
		// @ts-expect-error
		(...args) => curryAdd(args[0])(args[1]),
	);
	expectTypeOf(add).toMatchTypeOf<(a: number, b: number) => number>();

	t.is(add(1, 1), 2);
});
