import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectFromEntries} from '../source/index.js';

test('objectFromEntries() creates an own __proto__ data property safely', () => {
	const prototypeValue = {polluted: true};
	const result = objectFromEntries([['__proto__', prototypeValue], ['safe', 1]] as const);

	expectTypeOf(result).toEqualTypeOf<{__proto__: {polluted: boolean}; safe: 1}>();
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
	assert.deepEqual(Object.getOwnPropertyDescriptor(result, '__proto__'), {
		value: prototypeValue,
		writable: true,
		enumerable: true,
		configurable: true,
	});
	assert.equal('polluted' in result, false);
	assert.equal(result.safe, 1);
});

test('objectFromEntries()', () => {
	const symbolKey = Symbol('symbolKey');

	const objectFromEntries_ = objectFromEntries([
		[1, 123],
		['stringKey', 'someString'],
		[symbolKey, true],
	]);

	// Broad array literal → optional keys for soundness
	expectTypeOf(objectFromEntries_[1]).toEqualTypeOf<number | string | undefined>();
	expectTypeOf(objectFromEntries_['stringKey']).toEqualTypeOf<number | string | undefined>();
	expectTypeOf(objectFromEntries_[symbolKey]).toEqualTypeOf<boolean | undefined>();
	assert.deepEqual(objectFromEntries_, {
		1: 123,
		stringKey: 'someString',
		[symbolKey]: true,
	});

	const objectFromReadonlyEntries_ = objectFromEntries([
		[1, 123],
		['stringKey', 'someString'],
		[symbolKey, true],
	] as const);

	// Fixed tuple (as const) → required keys, and the values keep their literal types. The expected types name the literals, since `number`, `string` and `boolean` are satisfied by every literal and cannot tell a widened result from one that is not.
	expectTypeOf(objectFromReadonlyEntries_[1]).toEqualTypeOf<123>();
	expectTypeOf(objectFromReadonlyEntries_.stringKey).toEqualTypeOf<'someString'>();
	expectTypeOf(objectFromReadonlyEntries_[symbolKey]).toEqualTypeOf<true>();
	assert.deepEqual(objectFromReadonlyEntries_, {
		1: 123,
		stringKey: 'someString',
		[symbolKey]: true,
	});

	// Duplicate keys → union of values for that key
	const duplicateKeys = objectFromEntries([
		['A', 1],
		['A', 3],
	] as const);
	expectTypeOf(duplicateKeys.A).toEqualTypeOf<1 | 3>();

	// Empty tuple → no keys
	const empty = objectFromEntries([] as const);
	expectTypeOf<keyof typeof empty>().toBeNever();

	// Broad array with key union → optional per key
	const unionArray: Array<['A', 1] | ['B', 2]> = [
		['A', 1],
		['B', 2],
	];
	const unionObject = objectFromEntries(unionArray);
	expectTypeOf(unionObject.A).toEqualTypeOf<1 | undefined>();
	expectTypeOf(unionObject.B).toEqualTypeOf<2 | undefined>();

	// Cannot assume presence when entries are a broad array
	// @ts-expect-error
	void (unionObject.A + unionObject.B);
	// @ts-expect-error - Key not present in the key union
	void unionObject.C;

	// Tuple literal ensures presence
	const tupleEntries = [
		['A', 1],
		['B', 2],
	] as const;
	const tupleObject = objectFromEntries(tupleEntries);
	expectTypeOf(tupleObject.A).toEqualTypeOf<1>();
	expectTypeOf(tupleObject.B).toEqualTypeOf<2>();
	void (tupleObject.A + tupleObject.B);

	// Broad array with duplicate keys → optional unioned values
	const duplicateBroad: Array<['A', 1] | ['A', 3]> = [];
	const duplicateBroadObject = objectFromEntries(duplicateBroad);
	expectTypeOf(duplicateBroadObject.A).toEqualTypeOf<1 | 3 | undefined>();
});

test('objectFromEntries() against what the builtin infers', () => {
	// The builtin returns `any` for a plain array literal, because TypeScript infers the entries as `(string | number)[][]` and only the `Iterable<readonly any[]>` overload matches. With `as const` the other overload matches and the keys and values survive.
	// `any` is the point.
	const fromLiteral = Object.fromEntries([['a', 123], ['b', 'x']]);
	expectTypeOf(fromLiteral).toEqualTypeOf<any>();

	const fromConst = Object.fromEntries([['a', 123]] as const);
	expectTypeOf(fromConst).toEqualTypeOf<Record<string, 123>>();

	// This function keeps the keys either way.
	expectTypeOf(objectFromEntries([['a', 123], ['b', 'x']] as const)).toEqualTypeOf<{a: 123; b: 'x'}>();
	const widened = objectFromEntries([['a', 123], ['b', 'x']]);
	expectTypeOf(widened).toEqualTypeOf<Record<string, number | string | undefined>>();
});

test('objectFromEntries() makes a union entry key optional', () => {
	// A `const` array has a fixed length, so the declared keys are normally all set. When an entry's key is a union, only the member the value holds is written, so no member is required and `result.missing` does not compile.
	const key = 'x' as 'x' | 'y';
	const result = objectFromEntries([[key, 1]] as const);

	expectTypeOf(result).toEqualTypeOf<{x?: 1; y?: 1}>();

	if (false) {
		// @ts-expect-error - Only one of the two keys exists at runtime.
		const required: {x: 1; y: 1} = result;
	}

	// A fixed set of literal keys is still all required.
	expectTypeOf(objectFromEntries([['a', 1], ['b', 2]] as const)).toEqualTypeOf<{a: 1; b: 2}>();

	const written = objectFromEntries([[key, 1]] as const) as {x?: number; y?: number};
	assert.deepEqual(Object.fromEntries([[key, 1]]), {x: 1});
	assert.equal(written.x, 1);
	assert.equal(written.y, undefined);
});

test('objectFromEntries() makes the keys optional for a widened entry key', () => {
	// A key that is not a finite set of literals names one key the runtime cannot list, so nothing it writes can be required. That holds even for an `as const` array, which has a fixed length.
	const widened = 'a' as string;
	const result = objectFromEntries([[widened, 1]] as const);

	// A required index signature is assignable to an optional one, and `noUncheckedIndexedAccess` would add the `undefined` on its own, so the result type is compared directly.
	expectTypeOf(result).toEqualTypeOf<{[x: string]: 1 | undefined}>();

	const index: number | undefined = result['anything'];
	void index;

	assert.deepEqual(Object.fromEntries([[widened, 1]]), {a: 1});
});

test('objectFromEntries() makes the keys optional for every widened key flavour', () => {
	const asNumber = 1 as number;
	const asTemplate = 'a' as `x${string}`;
	const asIntrinsic = 'a' as Uppercase<string>;

	// A `number` key is an infinite set, so nothing it writes can be required.
	// @ts-expect-error - The result is an index signature of `1 | undefined`, not `1`.
	const fromNumber: number = objectFromEntries([[asNumber, 1]] as const)[1];

	// A template-literal key yields a pattern index signature, so only a matching key reads it.
	const fromTemplate: number | undefined = objectFromEntries([[asTemplate, 1]] as const)['x1'];

	// Same for a string intrinsic key.
	const fromIntrinsic: number | undefined = objectFromEntries([[asIntrinsic, 1]] as const)['ABC'];

	void fromNumber;
	void fromTemplate;
	void fromIntrinsic;
});

test('objectFromEntries() makes the keys optional for a union of entry arrays', () => {
	// Only one branch of the union is written at runtime, so no key it declares is guaranteed.
	for (const branch of [true, false]) {
		const result = objectFromEntries(branch ? ([['a', 1]] as const) : ([['b', 2]] as const));

		expectTypeOf(result).toEqualTypeOf<{a?: 1; b?: 2}>();
		assert.deepEqual(result, branch ? {a: 1} : {b: 2});

		// A union with an empty branch writes nothing at all.
		const maybeEntries = branch ? ([['a', 1]] as const) : ([] as const);
		expectTypeOf(objectFromEntries(maybeEntries)).toEqualTypeOf<{a?: 1}>();
		assert.deepEqual(objectFromEntries(branch ? ([['a', 1]] as const) : ([] as const)), branch ? {a: 1} : {});

		// A single fixed-length array still gets required keys.
		expectTypeOf(objectFromEntries([['a', 1], ['b', 2]] as const)).toEqualTypeOf<{a: 1; b: 2}>();
	}
});

test('objectFromEntries() makes a key optional when another union branch widens it', () => {
	// A key that is not a finite set of literals names one key the runtime cannot list, so nothing it produces can be required. That holds across a union too, so the declared key in the other branch is not promised on the strength of a branch that may not run.
	for (const branch of [true, false]) {
		const entries = branch ? ([['a', 1]] as const) : ([['anyKey', 2]] as [[string, 2]]);

		const result = objectFromEntries(entries);
		expectTypeOf(result.a).toEqualTypeOf<1 | 2 | undefined>();
		assert.equal('a' in result, branch);
		assert.deepEqual(result, branch ? {a: 1} : {anyKey: 2});
	}
});

test('objectFromEntries() with duplicate keys', () => {
	// The runtime keeps the last entry for a key, so the declared value type is a superset of what it returns. It is sound, and it is the honest answer without walking the entries backwards.
	const result = objectFromEntries([['a', 1], ['a', 2]] as const);
	expectTypeOf(result.a).toEqualTypeOf<1 | 2>();
	assert.deepEqual(result, {a: 2});
});

test('objectFromEntries() with an empty entry list', () => {
	expectTypeOf(objectFromEntries([] as const)).toEqualTypeOf<{}>();
	assert.deepEqual(objectFromEntries([] as const), {});

	// A dynamic-length array of entries is already optional, since it can hold any subset.
	const dynamic = objectFromEntries([['a', 1]] as Array<readonly [string, number]>);
	expectTypeOf(dynamic['a']).toEqualTypeOf<number | undefined>();
	assert.deepEqual(dynamic, {a: 1});
});

test('objectFromEntries() makes the keys optional for an entry typed as a union of tuples', () => {
	for (const flag of [true, false]) {
		const entry = flag ? (['a', 1] as const) : (['b', 2] as const);
		const result = objectFromEntries([entry, ['c', 3]] as const);
		expectTypeOf(result).toEqualTypeOf<{a?: 1; b?: 2; c?: 3}>();
		assert.deepEqual(result, flag ? {a: 1, c: 3} : {b: 2, c: 3});
	}
});

test('objectFromEntries() includes a widened entry value when it overwrites a literal key', () => {
	const dynamicKey = 'a' as string;
	const result = objectFromEntries([['a', 1], [dynamicKey, 'changed']] as const);

	expectTypeOf(result.a).toEqualTypeOf<1 | 'changed' | undefined>();
	assert.deepEqual(result, {a: 'changed'});
});

test('objectFromEntries() combines numeric and string spellings of the same key', () => {
	const result = objectFromEntries([[1, 'first'], ['1', 2]] as const);

	expectTypeOf(result[1]).toEqualTypeOf<'first' | 2>();
	expectTypeOf(result['1']).toEqualTypeOf<'first' | 2>();
	assert.deepEqual(result, {1: 2});
});

test('objectFromEntries() includes values written through a matching template key', () => {
	const dynamicKey = 'item-one' as `item-${string}`;
	const result = objectFromEntries([['item-one', 1], ['other', true], [dynamicKey, 'changed']] as const);

	expectTypeOf(result['item-one']).toEqualTypeOf<1 | 'changed' | undefined>();
	expectTypeOf(result.other).toEqualTypeOf<true | undefined>();
	assert.deepEqual(result, {'item-one': 'changed', other: true});
});

test('objectFromEntries() includes numeric values that overwrite string keys', () => {
	const dynamicKey = 1 as number;
	const result = objectFromEntries([['1', 'first'], ['01', true], [dynamicKey, 2]] as const);

	expectTypeOf(result['1']).toEqualTypeOf<'first' | 2 | undefined>();
	expectTypeOf(result['01']).toEqualTypeOf<true | 2 | undefined>();
	assert.deepEqual(result, {'1': 2, '01': true});
});

test('objectFromEntries() includes literal entry values when reading a widened key', () => {
	const dynamicKey = 'b' as string;
	const readKey = 'a' as string;
	const result = objectFromEntries([['a', 1], [dynamicKey, 'changed']] as const);

	expectTypeOf(result[readKey]).toEqualTypeOf<1 | 'changed' | undefined>();
	assert.equal(result[readKey], 1);
});

test('objectFromEntries() combines values of overlapping template keys', () => {
	const prefixKey = 'item-one' as `item-${string}`;
	const suffixKey = 'item-one' as `${string}-one`;
	const result = objectFromEntries([[prefixKey, 1], [suffixKey, 'changed']] as const);

	expectTypeOf(result['item-one']).toEqualTypeOf<1 | 'changed' | undefined>();
	assert.deepEqual(result, {'item-one': 'changed'});
});

test('objectFromEntries() combines a widened symbol key with matching literal symbols', () => {
	const key = Symbol('shared');
	const otherKey = Symbol('other');
	const dynamicKey = key as symbol;
	const result = objectFromEntries([[key, 1], [otherKey, true], [dynamicKey, 'changed']] as const);

	expectTypeOf(result[key]).toEqualTypeOf<1 | 'changed' | undefined>();
	expectTypeOf(result[otherKey]).toEqualTypeOf<true | 'changed' | undefined>();
	// @ts-expect-error - Symbol entries do not create a string index signature.
	void result['missing'];
	assert.deepEqual(result, {[key]: 'changed', [otherKey]: true});
});

test('objectFromEntries() includes broad numeric values that overwrite non-finite string keys', () => {
	for (const key of [Infinity, -Infinity, NaN]) {
		const result = objectFromEntries([['Infinity', 1], ['-Infinity', 2], ['NaN', 3], [key, 'changed']] as const);

		expectTypeOf(result.Infinity).toEqualTypeOf<1 | 'changed' | undefined>();
		expectTypeOf(result['-Infinity']).toEqualTypeOf<2 | 'changed' | undefined>();
		expectTypeOf(result.NaN).toEqualTypeOf<3 | 'changed' | undefined>();
		assert.equal(result[String(key) as 'Infinity' | '-Infinity' | 'NaN'], 'changed');
		assert.equal(Object.keys(result).length, 3);
	}
});

test('objectFromEntries() treats opaque numeric keys as dynamic keys', () => {
	type NumericKey = number & {readonly __brand: unique symbol};
	const key = Infinity as NumericKey;
	const result = objectFromEntries([['Infinity', 1], [key, 'changed']] as const);

	expectTypeOf(result.Infinity).toEqualTypeOf<1 | 'changed' | undefined>();
	assert.deepEqual(result, {Infinity: 'changed'});
});

test('objectFromEntries() preserves numeric literal precision for unrelated keys', () => {
	const result = objectFromEntries([[1, 'first'], ['1', true], ['2', 2], ['label', 'kept']] as const);

	expectTypeOf(result[1]).toEqualTypeOf<'first' | true>();
	expectTypeOf(result['2']).toEqualTypeOf<2>();
	expectTypeOf(result.label).toEqualTypeOf<'kept'>();
	assert.deepEqual(result, {'1': true, '2': 2, label: 'kept'});
});
