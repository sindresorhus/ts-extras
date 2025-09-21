import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectHasOwn} from '../source/index.js';

test('objectHasOwn()', () => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	assert.equal(objectHasOwn(object_, 1), true);
	assert.equal(objectHasOwn(object_, 'b'), true);
	assert.equal(objectHasOwn(object_, symbolKey), true);
	assert.equal(objectHasOwn(object_, 'hello'), false);

	// Test that inherited properties return false
	assert.equal(objectHasOwn(object_, 'toString'), false);
	assert.equal(objectHasOwn(object_, 'valueOf'), false);

	if (objectHasOwn(object_, 1) && objectHasOwn(object_, 'b') && objectHasOwn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}

	// Test that it narrows the object type
	const data: unknown = {foo: 'test'};
	if (objectHasOwn(data, 'foo')) {
		expectTypeOf(data).toExtend<{foo: unknown}>();
		// Should be able to access the property
		assert.equal(typeof data.foo, 'string');
	}
});

test('objectHasOwn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(objectHasOwn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(objectHasOwn(object, 'toString'), false);
});

test('objectHasOwn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	assert.equal(objectHasOwn(object, symbol1), true);
	assert.equal(objectHasOwn(object, symbol2), false);

	if (objectHasOwn(object, symbol1)) {
		expectTypeOf(object).toExtend<{[symbol1]: unknown}>();
	}
});
