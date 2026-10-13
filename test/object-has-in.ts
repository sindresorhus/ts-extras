import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectHasIn, objectHasOwn} from '../source/index.js';

test('objectHasIn()', () => {
	const symbolKey = Symbol('symbolKey');

	const object_: unknown = {
		1: 1,
		b: 2,
		[symbolKey]: 3,
	};

	assert.equal(objectHasIn(object_, 1), true);
	assert.equal(objectHasIn(object_, 'b'), true);
	assert.equal(objectHasIn(object_, symbolKey), true);
	assert.equal(objectHasIn(object_, 'hello'), false);

	// Test prototype chain - toString is inherited
	assert.equal(objectHasIn(object_, 'toString'), true);
	assert.equal(objectHasIn(object_, 'valueOf'), true);

	if (objectHasIn(object_, 1) && objectHasIn(object_, 'b') && objectHasIn(object_, symbolKey)) {
		expectTypeOf<{
			1: unknown;
			b: unknown;
			[symbolKey]: unknown;
		}>(object_);
	}

	// Test that it narrows the object type
	const data: unknown = {foo: 'test'};
	if (objectHasIn(data, 'foo')) {
		expectTypeOf(data).toExtend<{foo: unknown}>();
		// Should be able to access the property
		assert.equal(typeof data.foo, 'string');
	}
});

test('objectHasIn() guards against prototype pollution', () => {
	const object: Record<string, unknown> = {foo: 1};

	// These are always false for security
	assert.equal(objectHasIn(object, '__proto__'), false);
	assert.equal(objectHasIn(object, 'constructor'), false);

	// Even when the value really owns the name. `__proto__:` in an object literal is the prototype setter, not a property, so the own property is built the way a parsed body arrives.
	const objectWithProto = JSON.parse('{"__proto__":"value","constructor":"value"}') as Record<string, unknown>;
	assert.equal(Object.hasOwn(objectWithProto, '__proto__'), true);
	assert.equal(objectHasIn(objectWithProto, '__proto__'), false);
	assert.equal(objectHasIn(objectWithProto, 'constructor'), false);
});

test('objectHasIn() with Object.create(null)', () => {
	const object = Object.create(null) as {foo?: number};
	object.foo = 1;

	assert.equal(objectHasIn(object, 'foo'), true);
	// No prototype, so no inherited properties
	assert.equal(objectHasIn(object, 'toString'), false);
});

test('objectHasIn() with symbols', () => {
	const symbol1 = Symbol('test1');
	const symbol2 = Symbol('test2');
	const object: unknown = {[symbol1]: 'value'};

	assert.equal(objectHasIn(object, symbol1), true);
	assert.equal(objectHasIn(object, symbol2), false);

	if (objectHasIn(object, symbol1)) {
		expectTypeOf(object).toExtend<{[symbol1]: unknown}>();
	}
});

test('objectHasIn() with primitives', () => {
	// The `in` operator throws on primitives, but `ObjectType` is unconstrained, so `objectHasIn` is routinely called on `unknown` values that are in fact primitives. Box the value instead of throwing, matching how `in` behaves for object wrappers.
	assert.equal(objectHasIn(42, 'toString'), true);
	assert.equal(objectHasIn(42, 'nope'), false);
	assert.equal(objectHasIn('abc', 'length'), true);
	assert.equal(objectHasIn('abc', 'toUpperCase'), true);
	assert.equal(objectHasIn(true, 'valueOf'), true);
	assert.equal(objectHasIn(10n, 'toFixed'), false);

	// Null and undefined have no wrapper object, so they are answered `false` before any boxing. Boxing them would give `in` an empty object that still inherits from `Object.prototype`, so `'toString' in Object(null)` is `true` and the guard would report a property on a value that owns nothing. Reading it in the narrowed branch throws. A prototype name is the only one that tells the two apart, since a name the value does not carry answers `false` whether or not it is boxed.
	for (const value of [null, undefined]) {
		assert.equal(objectHasIn(value, 'toString'), false);
		assert.equal(objectHasIn(value, 'valueOf'), false);
	}

	// `objectHasOwn()` boxes the same two and so answers `false` as well, which is the agreement the shared `null` case is for.
	assert.equal(objectHasOwn(null, 'toString'), false);
	assert.equal(objectHasOwn(undefined, 'toString'), false);

	// The prototype-pollution guard still wins over the boxed lookup.
	assert.equal(objectHasIn(42, '__proto__'), false);
	assert.equal(objectHasIn(42, 'constructor'), false);
});

test('objectHasIn() does not claim every key of a union is present', () => {
	// The runtime proves one key at a time, so a union key cannot turn all of its members into required properties. TypeScript cannot express "at least one of", so none is promised.
	const data: unknown = {a: 1};
	const key = 'a' as 'a' | 'b';

	if (objectHasIn(data, key)) {
		expectTypeOf(data).toEqualTypeOf<{a?: unknown; b?: unknown}>();
		assert.equal('a' in data, true);
		assert.equal('b' in data, false);
	}
});

test('objectHasIn() adds an optional index signature for a widened key', () => {
	// A `string` key names an unbounded set, so no single property is promised. The value is readable through the key as `unknown`.
	const data: unknown = {a: 1};
	const field: string = 'a';

	if (objectHasIn(data, field)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<string, unknown>>>();
		expectTypeOf(data[field]).toEqualTypeOf<unknown>();
	}

	if (objectHasIn(data, 0 as number)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<number, unknown>>>();
	}

	if (objectHasIn(data, Symbol('a') as symbol)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<symbol, unknown>>>();
	}

	if (objectHasIn(data, 'a1' as `a${string}`)) {
		expectTypeOf(data).toEqualTypeOf<Partial<Record<`a${string}`, unknown>>>();
	}

	// The runtime answers the question for the exact key.
	assert.equal(objectHasIn(data, 'a' as string), true);
	assert.equal(objectHasIn(data, 'zzz' as string), false);
	assert.equal(objectHasIn(data, 0 as number), false);
});

test('objectHasIn() answers false for a value whose keys cannot be read', () => {
	// A revoked proxy, or one whose trap throws, is a value whose keys cannot be read, and that is the same answer as one that has none. Mocking libraries and resource wrappers revoke on teardown, and `assertError()` already handles the identical hazard the same way.
	const {proxy, revoke} = Proxy.revocable({a: 1}, {});
	revoke();
	assert.equal(objectHasIn(proxy, 'a'), false);

	const hostile = new Proxy({}, {
		has() {
			throw new Error('nope');
		},
	});
	assert.equal(objectHasIn(hostile, 'a'), false);
	assert.equal(objectHasIn(hostile, 'toString'), false);

	// A working proxy is still inspected as usual.
	assert.equal(objectHasIn(new Proxy({a: 1}, {}), 'a'), true);
});

test('objectHasIn() keeps the value type of a key the value already declares', () => {
	// The guard proves the key, not the value, so a key the value already declares keeps its declared value type: a literal key on a `Record<string, number>` leaves `a` a number rather than widening it to `unknown`, and the proved key drops the `undefined` that `noUncheckedIndexedAccess` adds.
	const record: Record<string, number> = {a: 1};
	if (objectHasIn(record, 'a')) {
		expectTypeOf(record['a']).toEqualTypeOf<number>();
	} else {
		expectTypeOf(record).toEqualTypeOf<Record<string, number>>();
	}

	// An array element is the same case: the guard proves the index, not the value.
	const array = ['x', 'y'];
	if (objectHasIn(array, 0)) {
		expectTypeOf(array[0]).toEqualTypeOf<string>();
	}

	// A key the value does not declare is still added, which is the whole point of the guard.
	const data: unknown = {a: 1};
	if (objectHasIn(data, 'a')) {
		expectTypeOf(data).toExtend<{a: unknown}>();
	}

	// A union key the value already covers entirely adds nothing, since the runtime proves only one of them and both are declared either way.
	const unionKey = 'a' as 'a' | 'b';
	if (objectHasIn(record, unionKey)) {
		expectTypeOf(record['a']).toEqualTypeOf<number | undefined>();
	}
});

test('objectHasIn() does not promise a property for the names it refuses', () => {
	// The guard answers `false` for `__proto__` and `constructor` whatever the value is, so the true branch is impossible. A mixed key omits blocked members from the properties it proves, matching the runtime rejection in `keyIn()`.
	const data: unknown = {a: 1};

	if (objectHasIn(data, '__proto__')) {
		expectTypeOf(data).toEqualTypeOf<never>();
	}

	if (objectHasIn(data, 'constructor')) {
		expectTypeOf(data).toEqualTypeOf<never>();
	}

	// A union key drops the member the guard refuses and keeps the other one, required: a true branch means the key was not `constructor`, so `a` is what it proved.
	if (objectHasIn(data, 'a' as 'a' | 'constructor')) {
		expectTypeOf(data).branded.toEqualTypeOf<Record<'a', unknown>>();
		expectTypeOf(data.a).toEqualTypeOf<unknown>();
	}

	// The runtime really does refuse them.
	assert.equal(objectHasIn(data, '__proto__'), false);
	assert.equal(objectHasIn(data, 'constructor'), false);
	assert.equal(objectHasIn(Object.create(null) as object, '__proto__'), false);

	// `objectHasOwn()` is not blocked, so it may answer for them and may promise them.
	assert.equal(objectHasOwn(JSON.parse('{"__proto__":{"a":1}}') as object, '__proto__'), true);
});

test('objectHasIn() keeps unknown inputs usable when all candidate keys are blocked', () => {
	function inspect(value: unknown, key: '__proto__' | 'constructor') {
		if (objectHasIn(value, key)) {
			expectTypeOf(value).toBeNever();
			assert.fail('Blocked keys must never produce a true branch');
		}

		expectTypeOf(value).toEqualTypeOf<unknown>();
		return value;
	}

	const ownBlockedKeys = {['__proto__']: 'own', constructor: 'own'};
	for (const value of [undefined, null, 1, {}, ownBlockedKeys]) {
		assert.equal(inspect(value, '__proto__'), value);
		assert.equal(inspect(value, 'constructor'), value);
	}
});

test('objectHasIn() preserves typed inputs when a literal key is blocked', () => {
	function inspect(value: {readonly value: number} | undefined) {
		if (objectHasIn(value, '__proto__')) {
			expectTypeOf(value).toBeNever();
			assert.fail('Blocked keys must never produce a true branch');
		}

		expectTypeOf(value).toEqualTypeOf<{readonly value: number} | undefined>();
		return value?.value;
	}

	assert.equal(inspect({value: 1}), 1);
	assert.equal(inspect(undefined), undefined);
});

test('objectHasIn() still proves an allowed key mixed with blocked keys', () => {
	function inspect(value: unknown, key: 'value' | '__proto__' | 'constructor') {
		if (objectHasIn(value, key)) {
			expectTypeOf(value).branded.toEqualTypeOf<Record<'value', unknown>>();
			return value.value;
		}

		expectTypeOf(value).toEqualTypeOf<unknown>();
		return undefined;
	}

	assert.equal(inspect({value: 1}, 'value'), 1);
	assert.equal(inspect({value: 1}, '__proto__'), undefined);
	assert.equal(inspect({value: 1}, 'constructor'), undefined);
});

test('objectHasIn() keeps a nullable value in the false branch for a key mixed with a blocked name', () => {
	// The runtime answers `false` for the blocked name even when the value has the other key, so a member that declares that key must stay in the false branch.
	function inspect(value: {value: number} | null, key: 'value' | '__proto__') {
		if (objectHasIn(value, key)) {
			return 'present';
		}

		expectTypeOf(value).toEqualTypeOf<{value: number} | null>();
		return 'missing';
	}

	assert.equal(inspect({value: 1}, '__proto__'), 'missing');
	assert.equal(inspect({value: 1}, 'value'), 'present');
	assert.equal(inspect(null, 'value'), 'missing');
});
