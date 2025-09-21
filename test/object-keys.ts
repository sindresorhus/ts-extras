import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectKeys} from '../source/index.js';

type TestInterface = {
	e: string;
	f: number;
};

test('objectKeys()', () => {
	type Item = 'a' | 'b' | 'c' | '4';

	const items = objectKeys({
		a: 1,
		b: 2,
		c: 3,
		4: 4,
		[Symbol('5')]: 5,
	});

	expectTypeOf<Item[]>(items);
	assert.deepEqual(items, ['4', 'a', 'b', 'c']);

	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const interfaceItems = objectKeys(interfaceInput);
	expectTypeOf<Array<keyof TestInterface>>(interfaceItems);
	assert.deepEqual(interfaceItems, ['e', 'f']);
});
