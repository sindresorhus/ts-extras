import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectKeys} from '../source/index.js';

test('objectKeys()', t => {
	type Item = 'a' | 'b' | 'c';
	const items = objectKeys({a: 1, b: 2, c: 3});

	expectTypeOf<Item[]>(items);
	t.deepEqual(items, ['a', 'b', 'c']);
});
