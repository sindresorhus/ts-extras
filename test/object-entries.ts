import test from 'ava';
import {expectTypeOf} from 'expect-type';
import {objectEntries} from '../source/index.js';

test('objectEntries()', t => {
	type Entry = ['a' | 'b' | 'c', number];
	const entries = objectEntries({a: 1, b: 2, c: 3});

	expectTypeOf<Entry[]>(entries);
	t.deepEqual(entries, [['a', 1], ['b', 2], ['c', 3]]);
});
