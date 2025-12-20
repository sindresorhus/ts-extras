import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import type {LiteralUnion} from 'type-fest';
import {keyIn} from '../source/index.js';

declare const brandedStringSymbol: unique symbol;
type BrandedString = string & {[brandedStringSymbol]: 'BrandedString'};

test('keyIn() narrows key type', () => {
	const object = {foo: 1, bar: 2};

	// Union type narrowing
	const key = 'foo' as 'foo' | 'bar' | 'baz';
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<'foo' | 'bar'>();
		assert.equal(['foo', 'bar'].includes(key), true);
	}

	// String key stays string
	const string = 'foo' as string;
	if (keyIn(object, string)) {
		// When key is string type, keyIn keeps it as string
		expectTypeOf(string).toEqualTypeOf<string>();
	}

	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'baz'), false);
});

test('keyIn() does not narrow when key includes widened primitive', () => {
	const object = {foo: 1, 1: 'one'};
	const key = 1 as number | 'foo';

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<number | 'foo'>();
		assert.equal(key === 'foo' || typeof key === 'number', true);
	}

	assert.equal(keyIn(object, 1), true);
});

test('keyIn() does not narrow with LiteralUnion', () => {
	const object = {foo: 1, bar: 2};
	const key = 'foo' as LiteralUnion<'foo' | 'bar', string>;

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<LiteralUnion<'foo' | 'bar', string>>();
		assert.equal(typeof key, 'string');
	}
});

test('keyIn() does not narrow branded strings', () => {
	const object = {foo: 1};
	const key = 'foo' as BrandedString;

	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<BrandedString>();
		assert.equal(typeof key, 'string');
	}
});

test('keyIn() with prototype chain', () => {
	const object = {foo: 1};

	// ToString is inherited from Object.prototype
	assert.equal(keyIn(object, 'toString'), true);
	assert.equal(keyIn(object, 'valueOf'), true);
	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'bar'), false);
});

test('keyIn() guards against prototype pollution', () => {
	const object = {foo: 1};

	// These are always false for security
	assert.equal(keyIn(object, '__proto__'), false);
	assert.equal(keyIn(object, 'constructor'), false);

	// Even if explicitly defined
	const objectWithProto = {__proto__: 'value', constructor: 'value'};
	assert.equal(keyIn(objectWithProto, '__proto__'), false);
	assert.equal(keyIn(objectWithProto, 'constructor'), false);

	// Type narrowing excludes blocked keys
	const key = '__proto__' as '__proto__' | 'foo';
	if (keyIn(object, key)) {
		// Key is now narrowed to exclude '__proto__'
		expectTypeOf(key).toEqualTypeOf<'foo'>();
		assert.equal(key, 'foo');
	}

	// Also test with constructor
	const constructorKey = 'constructor' as 'constructor' | 'foo';
	if (keyIn(object, constructorKey)) {
		// Constructor is excluded from the narrowed type
		expectTypeOf(constructorKey).toEqualTypeOf<'foo'>();
		assert.equal(constructorKey, 'foo');
	}
});

test('keyIn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object = {[symbol1]: 'value'};

	assert.equal(keyIn(object, symbol1), true);
	assert.equal(keyIn(object, symbol2), false);

	const key = symbol1 as typeof symbol1 | typeof symbol2;
	if (keyIn(object, key)) {
		expectTypeOf(key).toEqualTypeOf<typeof symbol1>();
	}
});

test('keyIn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(keyIn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(keyIn(object, 'toString'), false);
});

test('keyIn() with index signatures', () => {
	const object: {[key: string]: unknown; specific: number} = {
		specific: 1,
		dynamic: 'test',
	};

	const key = 'specific' as 'specific' | 'other';

	// With index signature, all strings are valid keys
	if (keyIn(object, key)) {
		// Key is not narrowed much because of index signature
		expectTypeOf(key).toExtend<string>();
		assert.ok(true);
	}
});

test('keyIn() does not narrow in false branch', () => {
	const object = {foo: 1, bar: 2};
	const key = 'baz' as 'foo' | 'bar' | 'baz';

	if (!keyIn(object, key)) {
		// In the false branch, key should remain 'foo' | 'bar' | 'baz'
		// This assignment would fail if the type was incorrectly narrowed
		const preserved: 'foo' | 'bar' | 'baz' = key;
		assert.equal(typeof preserved, 'string');
	}

	// Test that true branch still narrows correctly
	const key2 = 'foo' as 'foo' | 'bar' | 'baz';
	if (keyIn(object, key2)) {
		// Key should be narrowed to 'foo' | 'bar'
		const narrowed: 'foo' | 'bar' = key2;
		assert.equal(narrowed, 'foo');
	}

	// Additional runtime test
	assert.equal(keyIn(object, 'foo'), true);
	assert.equal(keyIn(object, 'baz'), false);
});
