import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectValues} from '../source/index.js';

interface TestInterface {
	e: string;
	f: number;
}

test('objectValues()', () => {
	const values = objectValues({
		a: 1,
		b: 'hello',
		c: true,
		[Symbol('symbolKey')]: null,
	});

	expectTypeOf<Array<number | string | boolean>>(values);
	assert.deepEqual(values, [1, 'hello', true]);
});

test('objectValues() - array', () => {
	const values = objectValues([1, 2]);

	expectTypeOf<number[]>(values);
	assert.deepEqual(values, [1, 2]);
});

test('objectValues() - tuple', () => {
	const values = objectValues([1, 'a'] as const);

	expectTypeOf<Array<1 | 'a'>>(values);
	assert.deepEqual(values, [1, 'a']);
});

test('objectValues() - interface', () => {
	const interfaceInput: TestInterface = {e: 'a', f: 1};
	const values = objectValues(interfaceInput);
	expectTypeOf<Array<string | number>>(values);
	assert.deepEqual(values, ['a', 1]);
});

// Optional property
{
	type Foo = {
		a?: string;
	};

	const x: Foo = {};
	const values = objectValues(x);
	expectTypeOf<string[]>(values);
}
