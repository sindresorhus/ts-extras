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

test('objectValues() - array preserves negative numeric own keys', () => {
	const array = [1] as number[] & {'-1': string};
	array['-1'] = 'hello';

	const values = objectValues(array);

	expectTypeOf<Array<number | string>>(values);
	assert.deepEqual(values, [1, 'hello']);
});

test('objectValues() - array treats named own keys as unsupported in the types', () => {
	const array = [1, 2] as number[] & {foo: string};
	array.foo = 'hello';

	const values = objectValues(array);

	expectTypeOf<number[]>(values);
	// @ts-expect-error - Named array properties are intentionally not preserved in the typing.
	const typedValue: string = values[2];

	void typedValue;
	assert.deepEqual(values, [1, 2, 'hello']);
});

test('objectValues() - array subclass prototype accessors are excluded from typing', () => {
	class ExtendedArray extends Array<number> {
		get value(): number {
			return 3;
		}
	}

	const values = objectValues(new ExtendedArray(1, 2));

	expectTypeOf<number[]>(values);
	assert.deepEqual(values, [1, 2]);
});

test('objectValues() - tuple', () => {
	const values = objectValues([1, 'a'] as const);

	expectTypeOf<Array<1 | 'a'>>(values);
	assert.deepEqual(values, [1, 'a']);
});

test('objectValues() - variadic tuple', () => {
	const values = objectValues([1, 2, 3] as [1, ...number[]]);

	expectTypeOf<number[]>(values);
	assert.deepEqual(values, [1, 2, 3]);
});

test('objectValues() - variadic tuple preserves named extra keys', () => {
	const values = objectValues(Object.assign([1, 2] as [1, ...number[]], {foo: 'hello'}));

	expectTypeOf<Array<number | string>>(values);
	assert.deepEqual(values, [1, 2, 'hello']);
});

test('objectValues() - runtime still includes unsupported Array member-name shadows', () => {
	const values = objectValues(Object.assign([1, 2] as [1, 2], {map: Array.prototype.map}));

	assert.deepEqual(values, [1, 2, Array.prototype.map]);
});

test('objectValues() - runtime still includes unsupported mutable Array member-name shadows', () => {
	const values = objectValues(Object.assign([1, 2] as [1, 2], {sort: 'hello', fill: 'world', copyWithin: 'again'}));

	assert.deepEqual(values, [1, 2, 'hello', 'world', 'again']);
});

test('objectValues() - variadic tuple preserves numeric-like extra keys', () => {
	const values = objectValues(Object.assign([1, 2] as [1, ...number[]], {'-1': 'hello'}));

	expectTypeOf<Array<number | string>>(values);
	assert.deepEqual(values, [1, 2, 'hello']);
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
