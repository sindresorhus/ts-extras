import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectAssign} from '../source/index.js';

type CallableIndexSource<Key extends string, Value> = Record<Key, Value> & Record<string, Value | (() => Value)>;

test('objectAssign()', () => {
	const target = {a: 1, b: 2};

	const result = objectAssign(target, {b: 3});

	// Returns the same target, mutated in-place
	assert.equal(result, target);
	assert.deepEqual(result, {a: 1, b: 3});

	// Updating an existing key keeps the merged shape
	expectTypeOf(result).toEqualTypeOf<{a: number; b: number}>();

	// Adding a new key is reflected in the type
	const extended = objectAssign({a: 1}, {b: 2});
	expectTypeOf(extended).toEqualTypeOf<{a: number; b?: number}>();
	assert.deepEqual(extended, {a: 1, b: 2});

	// Overriding a key with a different type keeps both possibilities,
	// unlike `Object.assign()` which would intersect to `never`.
	const overridden = objectAssign({a: 1}, {a: 'x'});
	expectTypeOf(overridden).toEqualTypeOf<{a: number | string}>();
	assert.deepEqual(overridden, {a: 'x'});

	// Multiple sources merge in order, later sources winning
	const multiple = objectAssign({a: 1, b: 2}, {a: 10}, {b: 'x'});
	expectTypeOf(multiple).toEqualTypeOf<{a: number; b: number | string}>();
	assert.deepEqual(multiple, {a: 10, b: 'x'});

	// No sources returns the target type unchanged
	const untouched = objectAssign({a: 1});
	expectTypeOf(untouched).toEqualTypeOf<{a: number}>();
});

test('objectAssign() index-signature soundness', () => {
	// `Object.assign()` keeps the result as `{a: string}` here, so `.a.toUpperCase()`
	// compiles but throws at runtime. `objectAssign` widens `a` to `string | number`.
	const left: {a: string} = {a: '1'};
	const right: {[key: string]: number} = {a: 1};

	const merged = objectAssign(left, right);
	expectTypeOf(merged.a).toEqualTypeOf<string | number | undefined>();
	assert.equal(merged.a, 1);
});

test('objectAssign() merges named type aliases', () => {
	type Base = {id: number; name: string};
	type Patch = {name: number; active: boolean};

	const base: Base = {id: 1, name: 'x'};
	const patch: Patch = {name: 2, active: true};

	const merged = objectAssign(base, patch);
	expectTypeOf(merged).toEqualTypeOf<{id: number; name: string | number; active?: boolean}>();
	assert.deepEqual(merged, {id: 1, name: 2, active: true});
});

test('objectAssign() accepts interface sources conservatively', () => {
	interface Base {
		id: number;
		name: string;
	}

	interface Patch {
		name: number;
		active: boolean;
	}

	const base: Base = {id: 1, name: 'x'};
	const patch: Patch = {name: 2, active: true};

	const merged = objectAssign(base, patch);
	expectTypeOf(merged.id).toEqualTypeOf<number>();
	expectTypeOf(merged.name).toEqualTypeOf<unknown>();

	if (false) {
		// @ts-expect-error - Unsealed sources do not promise source-only keys, since they may be prototype-only or non-enumerable.
		merged.active;
	}

	assert.deepEqual(merged, {id: 1, name: 2, active: true});
});

test('objectAssign() widens index-signature target keys for interface sources', () => {
	interface Patch {
		name: number;
	}

	const target: Record<string, boolean> = {name: true};
	const patch: Patch = {name: 1};

	const merged = objectAssign(target, patch);
	expectTypeOf(merged.name).toEqualTypeOf<unknown>();

	if (false) {
		// @ts-expect-error - Interface sources may overwrite index-signature target keys with incompatible values.
		merged.name.valueOf();
	}

	assert.deepEqual(merged, {name: 1});
});

test('objectAssign() handles unkeyed object sources conservatively', () => {
	const source: object = {name: 1};

	const result = objectAssign({name: 'x'}, source);
	expectTypeOf(result).toEqualTypeOf<object>();

	if (false) {
		// @ts-expect-error - The source may overwrite any target key, so stale target properties are not preserved.
		result.name.toUpperCase();
	}

	assert.deepEqual(result, {name: 1});
});

test('objectAssign() preserves readonly target keys', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'x'};

	const result = objectAssign(entity, {name: 'y'});
	expectTypeOf(result).toEqualTypeOf<{readonly id: number; name: string}>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly
		result.id = 2;
	}

	assert.deepEqual(result, {id: 1, name: 'y'});
});

test('objectAssign() preserves readonly target keys for optional source keys', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'x'};

	const result = objectAssign(entity, {} as {id?: string});
	expectTypeOf(result.id).toEqualTypeOf<number | string | undefined>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because the optional source key may be omitted.
		result.id = 2;
	}

	assert.deepEqual(result, {id: 1, name: 'x'});
});

test('objectAssign() preserves readonly target keys for maybe assigned source keys', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'x'};
	const optionalSource: {id: string} | undefined = Math.random() > 0.5 ? {id: 'updated'} : undefined;
	const unionSource: {id: string} | {id?: string} = Math.random() > 0.5 ? {id: 'updated'} : {};

	const optionalResult = objectAssign(entity, optionalSource);
	expectTypeOf(optionalResult.id).toEqualTypeOf<number | string>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because the source may be omitted.
		optionalResult.id = 'changed';
	}

	const unionResult = objectAssign(entity, unionSource);
	expectTypeOf(unionResult.id).toEqualTypeOf<number | string | undefined>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because not every source variant definitely assigns it.
		unionResult.id = 'changed';
	}

	const arraySources: Array<{id: string}> = [];
	const arrayResult = objectAssign(entity, ...arraySources);
	expectTypeOf(arrayResult.id).toEqualTypeOf<number | string>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because a source array may be empty.
		arrayResult.id = 'changed';
	}

	interface InterfaceSource {
		id: string;
	}

	const interfaceArraySources: InterfaceSource[] = [];
	const interfaceArrayResult = objectAssign(entity, ...interfaceArraySources);
	expectTypeOf(interfaceArrayResult.id).toEqualTypeOf<unknown>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because conservative source arrays may be empty.
		interfaceArrayResult.id = 'changed';
	}

	const indexSignatureResult = objectAssign(entity, {} as Record<string, string>);
	expectTypeOf(indexSignatureResult.id).toEqualTypeOf<string | number | undefined>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because an index-signature source may not assign it.
		indexSignatureResult.id = 'changed';
	}
});

test('objectAssign() preserves readonly target keys for assigned source keys', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'x'};

	const result = objectAssign(entity, {id: 'updated'});
	expectTypeOf(result).toEqualTypeOf<{readonly id: string | number; name: string}>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because a structurally typed source may not actually assign it.
		result.id = 'changed';
	}

	assert.deepEqual(result, {id: 'updated', name: 'x'});

	const unionSource: {id: string} | {id: number} = Math.random() > 0.5 ? {id: 'updated'} : {id: 2};
	const unionResult = objectAssign(entity, unionSource);
	expectTypeOf(unionResult.id).toEqualTypeOf<string | number>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because a structurally typed source may not actually assign it.
		unionResult.id = 'changed';
	}

	const callableIndexWithDataSource: CallableIndexSource<'id', string> = {id: 'updated'};
	const callableIndexWithDataResult = objectAssign(entity, callableIndexWithDataSource);
	expectTypeOf(callableIndexWithDataResult.id).toEqualTypeOf<number | string | (() => string) | undefined>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because a structurally typed source may not actually assign it.
		callableIndexWithDataResult.id = 'changed';
	}
});

test('objectAssign() rejects callable targets', () => {
	const target = (): number => 1;

	if (false) {
		// @ts-expect-error - Callable targets are unsupported because callable objects cannot be merged without losing either call signatures or source override semantics.
		objectAssign(target, {x: 'a'});
	}
});

test('objectAssign() rejects constructable targets', () => {
	class Target {}

	if (false) {
		// @ts-expect-error - Constructable targets are unsupported because constructor objects cannot be merged without losing either construct signatures or source override semantics.
		objectAssign(Target, {x: 'a'});
	}
});

test('objectAssign() does not expose prototype-only source members', () => {
	const dateResult = objectAssign({}, new Date());

	if (false) {
		// @ts-expect-error - Date methods are prototype members and are not copied by Object.assign().
		dateResult.getTime();
	}

	class Source {
		value = 1;

		get computed(): number {
			return 1;
		}

		method(): number {
			return 1;
		}
	}

	const instanceResult = objectAssign({existing: true}, new Source());
	expectTypeOf(instanceResult.existing).toEqualTypeOf<boolean>();

	if (false) {
		// @ts-expect-error - Class instance source-only keys are not promised because they may be prototype-only or non-enumerable.
		instanceResult.value;

		// @ts-expect-error - Class methods are prototype members and are not copied by Object.assign().
		instanceResult.method;

		// @ts-expect-error - Class accessors are prototype members and are not copied by Object.assign().
		instanceResult.computed;
	}

	const overwritten = objectAssign({value: 'x'}, new Source());
	expectTypeOf(overwritten.value).toEqualTypeOf<unknown>();

	if (false) {
		// @ts-expect-error - Unsupported source keys may overwrite target keys, so the result is unknown instead of the stale target type.
		overwritten.value.toUpperCase();
	}

	assert.deepEqual(dateResult, {});
	assert.deepEqual(instanceResult, {existing: true, value: 1});
	assert.deepEqual(overwritten, {value: 1});
});

test('objectAssign() does not expose prototype-only members from structural aliases', () => {
	type SourceAlias = {
		value: number;
		method: () => number;
		optionalMethod?: () => number;
	};

	class Source {
		value = 1;

		method(): number {
			return 1;
		}
	}

	const source: SourceAlias = new Source();
	const result = objectAssign({}, source);

	expectTypeOf(result.value).toEqualTypeOf<number | undefined>();

	if (false) {
		// @ts-expect-error - Function-valued alias keys may be prototype members and are not promised.
		result.method();

		// @ts-expect-error - Optional function-valued alias keys may be prototype members and are not promised.
		result.optionalMethod();
	}

	assert.deepEqual(result, {value: 1});
	assert.equal('method' in result, false);

	type AccessorSourceAlias = {
		accessorValue: number;
	};

	class AccessorSource {
		get accessorValue(): number {
			return 1;
		}
	}

	const accessorSource: AccessorSourceAlias = new AccessorSource();
	const accessorResult = objectAssign({}, accessorSource);

	if (false) {
		// @ts-expect-error - Structurally typed accessor aliases may be prototype-only and are not promised.
		accessorResult.accessorValue.toFixed();
	}

	assert.deepEqual(accessorResult, {});
});

test('objectAssign() handles function-valued source keys conservatively', () => {
	const source: {
		handler: () => number;
		run: () => number;
	} = {
		handler(): number {
			return 1;
		},
		run: () => 2,
	};

	const result = objectAssign({handler: 1}, source);

	expectTypeOf(result.handler).toEqualTypeOf<number | (() => number)>();

	if (false) {
		// @ts-expect-error - Function-valued source keys may be prototype members and are not promised as source-only keys.
		result.run();

		// @ts-expect-error - Shared function-valued source keys may not overwrite the target.
		result.handler();
	}

	assert.equal((result as {handler: () => number}).handler(), 1);
	assert.equal((result as unknown as {run: () => number}).run(), 2);

	const methodResult = objectAssign({}, {
		run(): number {
			return 1;
		},
	});

	if (false) {
		// @ts-expect-error - Source-only function-valued keys are not promised.
		methodResult.run();
	}

	assert.equal((methodResult as {run: () => number}).run(), 1);

	const condition = Math.random() > 0.5;
	const mixedCallableSource: {handler: () => number} | {handler: string} = condition ? {handler: () => 1} : {handler: 'value'};
	const mixedCallableResult = objectAssign({handler: 1}, mixedCallableSource);
	expectTypeOf(mixedCallableResult.handler).toEqualTypeOf<number | string | (() => number)>();

	const callableIndexSource: Record<string, () => number> = {handler: () => 1};
	const callableIndexResult = objectAssign({handler: 1}, callableIndexSource);
	expectTypeOf(callableIndexResult.handler).toEqualTypeOf<number | (() => number) | undefined>();

	const callableIndexWithDataSource: CallableIndexSource<'value', number> = {value: 1};
	const callableIndexWithDataResult = objectAssign({}, callableIndexWithDataSource);
	expectTypeOf(callableIndexWithDataResult['value']).toEqualTypeOf<number | (() => number) | undefined>();

	const optionalCallableResult = objectAssign({} as {handler?: number}, {} as {handler?: () => number});
	expectTypeOf(optionalCallableResult.handler).toEqualTypeOf<number | (() => number) | undefined>();
});

test('objectAssign() replaces nested objects wholesale', () => {
	const target = {position: {x: 1, y: 2}, label: 'a'};

	const result = objectAssign(target, {position: {x: 9, y: 9, z: 9}});
	expectTypeOf(result.position).toEqualTypeOf<{x: number; y: number} | {x: number; y: number; z: number}>();
	assert.deepEqual(result.position, {x: 9, y: 9, z: 9});
});

test('objectAssign() handles optional source keys soundly', () => {
	// The key may or may not be overridden at runtime, so the result is a union
	// that also includes `undefined` since the optional value can be `undefined`.
	const result = objectAssign({a: 1}, {} as {a?: string});
	expectTypeOf(result.a).toEqualTypeOf<string | number | undefined>();
});

test('objectAssign() accepts nullish sources as no-ops', () => {
	type Options = {debug: boolean};
	type MaybeBroadPatch = {b: string} | {} | undefined;

	const defaults = {theme: 'light'};
	const options: Options | undefined = Math.random() > 0.5 ? {debug: true} : undefined;

	const result = objectAssign({}, defaults, options, null, undefined);
	expectTypeOf(result.theme).toEqualTypeOf<string | undefined>();
	expectTypeOf(result.debug).toEqualTypeOf<boolean | undefined>();
	assert.deepEqual(objectAssign({a: 1}, null, undefined), {a: 1});

	const existingKeyResult = objectAssign({debug: false}, options);
	expectTypeOf(existingKeyResult.debug).toEqualTypeOf<boolean>();

	const broadPatch: MaybeBroadPatch = {a: 'x'};
	const broadResult = objectAssign({a: 1}, broadPatch);
	expectTypeOf(broadResult).toEqualTypeOf<object>();

	if (false) {
		// @ts-expect-error - A broad `{}` branch may overwrite target keys, so stale target properties are not preserved.
		broadResult.a.toFixed();
	}
});

test('objectAssign() preserves target type for primitive no-op source branches', () => {
	const condition = Math.random() > 0.5;
	const conditionalResult = objectAssign({a: 1}, condition && {b: 2});
	expectTypeOf(conditionalResult.a).toEqualTypeOf<number>();
	expectTypeOf(conditionalResult.b).toEqualTypeOf<number | undefined>();

	const primitiveSource = (): false | 0 | 0n | symbol | {b: number} => condition ? {b: 2} : Symbol('no-op');
	const primitiveResult = objectAssign({a: 1}, primitiveSource());
	expectTypeOf(primitiveResult.a).toEqualTypeOf<number>();
	expectTypeOf(primitiveResult.b).toEqualTypeOf<number | undefined>();

	const stringSource = (): string | {b: number} => condition ? {b: 2} : 'no-op';
	const stringResult = objectAssign({a: 1}, stringSource());
	expectTypeOf(stringResult).toEqualTypeOf<object>();

	// Primitive sources are ignored at runtime, leaving the target untouched.
	assert.deepEqual(objectAssign({a: 1}, false as false, 0 as 0, Symbol('no-op')), {a: 1});
});

test('objectAssign() distributes over union targets', () => {
	type Shape = {kind: 'a'; x: number} | {kind: 'b'; y: number};

	const result = objectAssign({kind: 'a', x: 1} as Shape, {z: true});
	expectTypeOf(result).toEqualTypeOf<
		| {kind: 'a'; x: number; z?: boolean}
		| {kind: 'b'; y: number; z?: boolean}
	>();
	assert.deepEqual(result, {kind: 'a', x: 1, z: true});
});

test('objectAssign() preserves symbol keys', () => {
	const key: unique symbol = Symbol('key');

	const result = objectAssign({a: 1}, {[key]: 'x'} as {[key]: string});
	expectTypeOf(result[key]).toEqualTypeOf<string | undefined>();
	assert.equal(result[key], 'x');
});

test('objectAssign() preserves numeric keys', () => {
	const result = objectAssign({0: 'a'}, {1: 2});
	expectTypeOf(result).toEqualTypeOf<{0: string; 1?: number}>();
	assert.deepEqual(result, {0: 'a', 1: 2});
});

test('objectAssign() accepts a spread of sources', () => {
	const sources = [{a: 1}, {b: 'x'}] as const;

	const result = objectAssign({}, ...sources);
	expectTypeOf(result).toEqualTypeOf<{a?: 1; b?: 'x'}>();
	assert.deepEqual(result, {a: 1, b: 'x'});
});

test('objectAssign() accepts a spread of non-tuple sources', () => {
	const sources: Array<{a: number}> = [{a: 1}, {a: 2}];

	const result = objectAssign({}, ...sources);
	expectTypeOf(result.a).toEqualTypeOf<number | undefined>();
	assert.deepEqual(result, {a: 2});

	const emptySources: Array<{a: number}> = [];
	const emptyResult = objectAssign({}, ...emptySources);
	expectTypeOf(emptyResult.a).toEqualTypeOf<number | undefined>();
	assert.deepEqual(emptyResult, {});

	const maybeSources: Array<{a: number} | undefined> = [{a: 1}, undefined, {a: 2}];
	const maybeResult = objectAssign({}, ...maybeSources);
	expectTypeOf(maybeResult.a).toEqualTypeOf<number | undefined>();
	assert.deepEqual(maybeResult, {a: 2});

	const maybeExistingKeyResult = objectAssign({a: 0}, ...maybeSources);
	expectTypeOf(maybeExistingKeyResult.a).toEqualTypeOf<number>();

	class Source {
		value = 1;

		method(): number {
			return 1;
		}
	}

	const instanceSources: Source[] = [new Source()];
	const instanceResult = objectAssign({value: 'x'}, ...instanceSources);
	expectTypeOf(instanceResult.value).toEqualTypeOf<unknown>();

	if (false) {
		// @ts-expect-error - Non-tuple class source arrays do not promise source-only keys.
		objectAssign({}, ...instanceSources).value;

		// @ts-expect-error - Non-tuple class source arrays do not expose prototype methods.
		instanceResult.method;
	}

	assert.deepEqual(instanceResult, {value: 1});
});

test('objectAssign() falls back to object for arrays, maps, and sets', () => {
	type ObjectAssignFallback = object; // eslint-disable-line @typescript-eslint/no-restricted-types -- This is the intentional fallback for TypeFest's unsupported merge inputs.

	const arrayResult = objectAssign([], {a: 1});
	expectTypeOf(arrayResult).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((arrayResult as {a: number}).a, 1);

	const mapResult = objectAssign(new Map(), {a: 1});
	expectTypeOf(mapResult).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((mapResult as {a: number}).a, 1);

	const setResult = objectAssign(new Set(), {a: 1});
	expectTypeOf(setResult).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((setResult as {a: number}).a, 1);
});

test('objectAssign() layers defaults and overrides', () => {
	const result = objectAssign({theme: 'light', debug: false}, {debug: true}, {theme: 'dark'});
	expectTypeOf(result).toEqualTypeOf<{theme: string; debug: boolean}>();
	assert.deepEqual(result, {theme: 'dark', debug: true});
});
