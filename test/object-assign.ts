import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectAssign, objectUpdate} from '../source/index.js';

type CallableIndexSource<Key extends string, Value> = Record<Key, Value> & Record<string, Value | (() => Value)>;

test('object assignment snapshots keys but checks enumerability when each key is copied', () => {
	for (const shouldUpdate of [false, true]) {
		const symbol = Symbol('last');
		const target: Record<PropertyKey, unknown> = {};
		const source: Record<PropertyKey, unknown> = {
			get first() {
				Object.defineProperties(source, {
					removed: {enumerable: false},
					revealed: {enumerable: true},
				});
				source['added'] = 4;
				return 1;
			},
			removed: 2,
			revealed: 3,
			get [symbol]() {
				assert.equal(target['first'], 1);
				assert.equal(target['revealed'], 3);
				return 5;
			},
		};
		Object.defineProperty(source, 'revealed', {enumerable: false});

		const result = shouldUpdate ? objectUpdate(target, source) : objectAssign(target, source);
		assert.equal(result, target);
		assert.deepEqual(target, {first: 1, revealed: 3, [symbol]: 5});
		assert.equal(Object.hasOwn(target, 'removed'), false);
		assert.equal(Object.hasOwn(target, 'added'), false);
	}
});

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

	// Overriding a key with a different type keeps both possibilities, unlike `Object.assign()` which would intersect to `never`.
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
	// `Object.assign()` keeps the result as `{a: string}` here, so `.a.toUpperCase()` compiles but throws at runtime. `objectAssign` widens `a` to `string | number`.
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
	expectTypeOf(merged['name']).toEqualTypeOf<unknown>();

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
	expectTypeOf(merged['name']).toEqualTypeOf<unknown>();

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
	expectTypeOf(result.id).toEqualTypeOf<number | string>();

	if (false) {
		// @ts-expect-error - 'id' remains readonly because the optional source key may be omitted.
		result.id = 2;
	}

	assert.deepEqual(result, {id: 1, name: 'x'});
});

test('objectAssign() preserves readonly target keys for maybe assigned source keys', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'x'};
	const optionalSource = {id: 'updated'} as {id: string} | undefined;
	const unionSource = {id: 'updated'} as {id: string} | {id?: string};

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

	const unionSource = {id: 'updated'} as {id: string} | {id: number};
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
		accessorResult.accessorValue.toFixed(0);
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

	const condition = true as boolean;
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
	// The key may or may not be overridden at runtime, so the result is a union. An optional property that does not declare `| undefined` cannot hold it, so the result has no `undefined`.
	const result = objectAssign({a: 1}, {} as {a?: string});
	expectTypeOf(result.a).toEqualTypeOf<string | number>();

	// One that declares `| undefined` can, so the result keeps it.
	const explicit = objectAssign({a: 1}, {} as {a?: string | undefined});
	expectTypeOf(explicit.a).toEqualTypeOf<string | number | undefined>();
});

test('objectAssign() accepts nullish sources as no-ops', () => {
	type Options = {debug: boolean};
	type MaybeBroadPatch = {b: string} | {} | undefined;

	const defaults = {theme: 'light'};
	const options = {debug: true} as Options | undefined;

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
		broadResult.a.toFixed(0);
	}
});

test('objectAssign() preserves target type for primitive no-op source branches', () => {
	const condition = true as boolean;
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

declare enum Status {Ok = 200, NotFound = 404}

test('objectAssign() preserves numeric keys', () => {
	const result = objectAssign({0: 'a'}, {1: 2});
	expectTypeOf(result).toEqualTypeOf<{0: string; 1?: number}>();
	assert.deepEqual(result, {0: 'a', 1: 2});

	// A numeric enum member is its own type, so a source key of that type is shared, while a plain numeric literal is not, the same way `{200: …}` does not satisfy `Record<Status, …>`. The literal is a source-only key here, but type-fest's `ObjectMerge` then matches it to the enum member, so the merged shape has both keys. `declare enum` has no runtime form, so these pins are type-only.
	if (false) {
		const fromEnum = objectAssign({} as Record<Status, string>, {[Status.Ok]: 'updated'});
		expectTypeOf(fromEnum[Status.Ok]).toEqualTypeOf<string>();
		expectTypeOf(fromEnum[Status.NotFound]).toEqualTypeOf<string>();

		const fromLiteral = objectAssign({} as Record<Status, string>, {200: 'updated'});
		expectTypeOf(fromLiteral).toEqualTypeOf<{200: string; 404: string}>();
	}
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
	// This is the intentional fallback for TypeFest's unsupported merge inputs.
	type ObjectAssignFallback = object;

	const arrayResult = objectAssign([], {a: 1});
	expectTypeOf(arrayResult).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((arrayResult as {a: number}).a, 1);

	const mapResult = objectAssign(new Map(), {a: 1});
	expectTypeOf(mapResult).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((mapResult as {a: number}).a, 1);

	const resultFromSet = objectAssign(new Set(), {a: 1});
	expectTypeOf(resultFromSet).toEqualTypeOf<ObjectAssignFallback>();
	assert.equal((resultFromSet as {a: number}).a, 1);
});

test('objectAssign() layers defaults and overrides', () => {
	const result = objectAssign({theme: 'light', debug: false}, {debug: true}, {theme: 'dark'});
	expectTypeOf(result).toEqualTypeOf<{theme: string; debug: boolean}>();
	assert.deepEqual(result, {theme: 'dark', debug: true});
});

test('objectAssign() keeps a shared key optional when either side declares it optional', () => {
	// The shared-key mapped type is not homomorphic, so it does not carry the optionality of either side on its own, and the key has to stay optional because the result may simply not have it.
	const target: {a?: number; b: string} = {b: 'x'};
	const optionalString: {a?: string} = {};
	const result = objectAssign(target, optionalString);
	expectTypeOf(result).toEqualTypeOf<{a?: number | string; b: string}>();

	// Stays optional after a later source mentions it too.
	const optionalNumber: {a?: number} = {};
	const chained = objectAssign({b: 'x'}, optionalString, optionalNumber);
	expectTypeOf(chained).toEqualTypeOf<{a?: number | string; b: string}>();
	assert.deepEqual(chained, {b: 'x'});

	// An optional target key is not made required by a source that declares the key.
	const optionalTarget = objectAssign(target, {a: 1});
	expectTypeOf(optionalTarget).toEqualTypeOf<{a?: number; b: string}>();

	// Both sides required, so the key is genuinely present.
	const required = objectAssign({a: 1, b: 'x'}, {a: 2});
	expectTypeOf(required).toEqualTypeOf<{a: number; b: string}>();
	assert.deepEqual(required, {a: 2, b: 'x'});
});

test('objectAssign() widens target keys a union source can overwrite', () => {
	// `keyof` a union is the intersection of its members' keys, so a key only one member has, like `retries`, has to be read per member, or the target's own type would be kept for a key the source does overwrite. A function return keeps the union; an annotated `const` would be narrowed to the initializer's type at the use site, which is the single branch this test is not about.
	const patch = (): {kind: 'sync'; retries: string} | {kind: 'stream'; batchSize: number} => ({kind: 'sync', retries: 'x'});
	const config = {retries: 1, timeout: 30};

	const merged = objectAssign(config, patch());
	expectTypeOf(merged.retries).toEqualTypeOf<number | string>();
	expectTypeOf(merged.kind).toEqualTypeOf<'sync' | 'stream' | undefined>();
	expectTypeOf(merged.batchSize).toEqualTypeOf<number | undefined>();
	expectTypeOf(merged.timeout).toEqualTypeOf<number>();

	assert.deepEqual(objectAssign({retries: 1, timeout: 30}, {kind: 'sync', retries: 'x'}), {retries: 'x', timeout: 30, kind: 'sync'});
});

test('objectAssign() does not add undefined for a key only some union members have', () => {
	// A key the target also has is only widened with the values the source can actually hold for it. A branch that lacks the key leaves the target value in place rather than clearing it.
	const patch = (): {kind: 'sync'; retries: string} | {kind: 'stream'} => ({kind: 'stream'});
	const merged = objectAssign({retries: 1, timeout: 30}, patch());

	expectTypeOf(merged.retries).toEqualTypeOf<number | string>();
	assert.deepEqual(objectAssign({retries: 1, timeout: 30}, {kind: 'stream'}), {retries: 1, timeout: 30, kind: 'stream'});
});

test('objectAssign() widens union sources through the other shapes', () => {
	// An interface has no implicit index signature, which is the point of this test.
	interface PatchOne {
		kind: 'x';
		a: string;
	}

	interface PatchTwo {
		kind: 'y';
		b: number;
	}

	const patchOne: PatchOne = {kind: 'x', a: 'text'};
	const patchTwo: PatchTwo = {kind: 'y', b: 2};
	const union = () => patchOne as PatchOne | PatchTwo;

	// Interfaces, not just type literals.
	expectTypeOf(objectAssign({a: 1}, union())).toEqualTypeOf<{
		a: string | number;
		b?: number;
		kind?: 'x' | 'y';
	}>();

	// A spread of a non-tuple array of the same union.
	const sources: Array<PatchOne | PatchTwo> = [patchOne, patchTwo];
	expectTypeOf(objectAssign({a: 1}, ...sources).a).toEqualTypeOf<string | number>();

	// A key only one branch has widens only with the values that branch can give it.
	const oneBranch: {a: number; n: number} = {a: 1, n: 1};
	const oneBranchSource = (): {n: number; a: string} | {n: string} => ({n: 1, a: 'text'});
	expectTypeOf(objectAssign(oneBranch, oneBranchSource())).toEqualTypeOf<{
		a: string | number;
		n: string | number;
	}>();
});

test('objectAssign() rejects a target that is still generic', () => {
	// The callable and constructable checks cannot be resolved before instantiation, so a target that is still a type parameter is rejected. Narrowing it first is the way through.
	// @ts-expect-error - A generic target cannot be resolved.
	const assign = <Target extends object>(target: Target) => objectAssign(target, {a: 1});
	void assign;

	const narrowed: {a: number} = {a: 1};
	expectTypeOf(objectAssign(narrowed, {a: 2})).toEqualTypeOf<{a: number}>();
	assert.deepEqual(objectAssign(narrowed, {a: 2}), {a: 2});
});

test('objectAssign() reads an intersection source member by member', () => {
	// `Source[Key]` on an intersection is the intersection of the members' value types, so `{a: string} & {a: number}` reads back `never`. The runtime keeps whichever value it copied, and TypeScript cannot name which member wins, so the value widens to `unknown` rather than leaving the target's own, narrower type as the whole answer.
	const shared = objectAssign({a: 1}, {a: 'x'} as {a: string} & {a: number});
	expectTypeOf(shared).toEqualTypeOf<{a: unknown}>();
	assert.deepEqual(shared, {a: 'x'});

	// A source-only key collapses the same way, to `undefined` here.
	const sourceOnly = objectAssign({}, {a: 'x'} as {a: string} & {a: number});
	expectTypeOf(sourceOnly).toEqualTypeOf<{a?: unknown}>();
	assert.deepEqual(sourceOnly, {a: 'x'});

	// A non-conflicting intersection is unaffected.
	const plain = objectAssign({a: 1}, {b: 2, c: 'x'} as {b: number} & {c: string});
	expectTypeOf(plain).toEqualTypeOf<{a: number; b?: number; c?: string}>();
	assert.deepEqual(plain, {a: 1, b: 2, c: 'x'});
});

test('objectAssign() treats a void-typed source conservatively', () => {
	// A `void`-typed call can return an object that replaces target properties, even when these particular calls return `undefined`. The result cannot promise the target's original shape.
	const target = {a: 1};

	expectTypeOf(objectAssign(target, undefined as void)).toEqualTypeOf<object>();
	assert.deepEqual(objectAssign(target, undefined as void), {a: 1});

	// A callback that returns nothing still leaves the type open to one that returns an object.
	const callback = (() => {}) as () => void;
	expectTypeOf(objectAssign(target, callback())).toEqualTypeOf<object>();
	assert.deepEqual(objectAssign(target, callback()), {a: 1});

	// Several void-typed sources have the same uncertainty, even when this array is empty.
	expectTypeOf(objectAssign(target, ...([] as Array<void>))).toEqualTypeOf<object>();
	assert.deepEqual(objectAssign(target, ...([] as Array<void>)), {a: 1});
});

test('objectAssign() types the source keys from the source alone for an unkeyed object target', () => {
	// `keyof object` is `never`, so the target has no known keys. That is the documented limitation: the target may already hold a source key with another type.
	const target = {name: 1} as object;
	const source: {a: string; b: string} = {a: 'x', b: 'y'};

	const result = objectAssign(target, source);
	expectTypeOf(result).toEqualTypeOf<{a?: string; b?: string}>();
	assert.deepEqual(result, {name: 1, a: 'x', b: 'y'});

	// A named target is unaffected: the shared key keeps both value types and the rest stay optional.
	const named = objectAssign({a: 1}, source);
	expectTypeOf(named.a).toEqualTypeOf<number | string>();
	expectTypeOf(named.b).toEqualTypeOf<string | undefined>();
	assert.deepEqual(named, {a: 'x', b: 'y'});
});

test('objectAssign() does not let a source replace the target prototype', () => {
	// `Object.assign()` writes with `[[Set]]`, so an own `__proto__` on the source invokes the inherited setter and swaps the target's prototype instead of writing a property. It is the same hazard `objectUpdate()` guards against, and the same name `keyIn()` and `objectHasIn()` refuse outright.
	const record: Record<string, object> = {};
	const source = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, object>;

	objectAssign(record, source);
	assert.deepEqual(Object.keys(record), []);
	assert.equal(Object.getPrototypeOf(record), Object.prototype);
	assert.equal(({} as Record<string, unknown>)['polluted'], undefined);

	// A named key still merges, and `constructor` really is an own property, so it is not skipped.
	const target = {name: 'x'};
	objectAssign(target, {name: 'y'}, {constructor: 'kept'});
	assert.equal(target.name, 'y');
	assert.equal(Object.getOwnPropertyDescriptor(target, 'constructor')?.value, 'kept');

	// A function is a source too, and the guard has to cover it. A `typeof source !== 'object'` check lets one straight through, and the target's prototype is then swapped.
	const functionSource = function named() {};
	Object.defineProperty(functionSource, '__proto__', {
		value: {polluted: true}, enumerable: true, writable: true, configurable: true,
	});
	const fromFunction: Record<string, unknown> = {};
	objectAssign(fromFunction, functionSource as unknown as Record<string, number>);
	assert.deepEqual(Object.keys(fromFunction), []);
	assert.equal(Object.getPrototypeOf(fromFunction), Object.prototype);
});

test('objectAssign() skips a prototype-carrying source in every position', () => {
	// Insert the carrying source in every position to prove that skipping its prototype key preserves all other sources.
	const carrying = '{"__proto__":{"polluted":true},"sibling":9}';

	for (const position of [0, 1, 2, 3]) {
		const sources: unknown[] = [{first: 1}, {second: 2}, {third: 3}];
		sources.splice(position, 0, JSON.parse(carrying));
		const target: Record<string, unknown> = {};

		objectAssign(target, ...(sources as Record<string, unknown>[]));

		// `sibling` proves the copy kept the other keys, and the three named ones prove the other sources still merged, whichever side of the carrying source they sit on. The order follows the position, so only the set is compared.
		assert.deepEqual(Object.keys(target).toSorted(), ['first', 'second', 'sibling', 'third'], `position ${position}`);
		assert.equal(Object.getPrototypeOf(target), Object.prototype, `position ${position}`);
		assert.equal(({} as Record<string, unknown>)['polluted'], undefined, `position ${position}`);
	}
});

test('objectAssign() keeps the sibling keys of a prototype-carrying source', () => {
	// Include sibling keys so the test catches skipping the entire source instead of just its prototype key.
	const source = JSON.parse('{"before":1,"__proto__":{"polluted":true},"after":2}') as Record<string, unknown>;
	const target: Record<string, unknown> = {kept: true};

	objectAssign(target, source);

	assert.deepEqual(Object.keys(target), ['kept', 'before', 'after']);
	assert.deepEqual({...target}, {kept: true, before: 1, after: 2});
	assert.equal(Object.getPrototypeOf(target), Object.prototype);
	assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
});

test('objectAssign() folds several sources left to right', () => {
	// The declared types are conservative, so a shared key keeps both value types no matter how many sources name it. What the runtime keeps is the last one, and folding the other way round would claim the wrong one.
	const target = {a: 1, b: 1};
	const result = objectAssign(target, {a: 'x'}, {b: true}, {a: 2});

	expectTypeOf(result.a).toEqualTypeOf<number | string>();
	expectTypeOf(result.b).toEqualTypeOf<number | boolean>();
	assert.deepEqual(result, {a: 2, b: true});

	// A no-op source in the middle changes nothing.
	assert.deepEqual(objectAssign({a: 1}, {a: 2}, undefined, {a: 3}), {a: 3});

	// Five sources fold the same way.
	const many = objectAssign({a: 0}, {a: 1}, {a: 2}, {a: 3}, {a: 'x'});
	expectTypeOf(many.a).toEqualTypeOf<number | string>();
	assert.deepEqual(many, {a: 'x'});
});

test('objectAssign() mutates the target in place', () => {
	// The result is the same object, not a copy, which is what makes the conservative type sound: a source-only key really does appear on the caller's object.
	const target: {a: number; b?: string} = {a: 1};
	const result = objectAssign(target, {b: 'x'});

	assert.equal(result, target);
	assert.equal(target.b, 'x');
});

test('objectAssign() reports a sound result for every source shape', () => {
	// Each of these is a shape where a plausible shortcut would promise something the runtime cannot deliver, so the declared result is pinned rather than assumed.
	expectTypeOf(objectAssign({a: 1}, {b: 2})).toEqualTypeOf<{a: number; b?: number}>();
	expectTypeOf(objectAssign({a: 1}, {a: 'x'})).toEqualTypeOf<{a: number | string}>();
	expectTypeOf(objectAssign({}, {a: 1})).toEqualTypeOf<{a?: number}>();
	// Regression: a key covered by an index signature is typed like reading it from the target, and the index signature's value type stays clean.
	expectTypeOf(objectAssign({} as Record<string, number>, {a: 1})).toEqualTypeOf<{[x: string]: number; a: number}>();

	// A source that keeps its state in internal slots contributes no keys at all.
	expectTypeOf(objectAssign({a: 1}, new Date())).toEqualTypeOf<{a: number}>();
	// An array source shares no key with a plain target, so the target's own type survives.
	expectTypeOf(objectAssign({a: 1}, [1, 2])).toEqualTypeOf<{a: number}>();
	expectTypeOf(objectAssign({a: 1}, 'text' as string)).toEqualTypeOf<object>();

	// An optional source key cannot narrow a required target key away.
	const optionalSource = objectAssign({a: 1}, {} as {a?: string});
	expectTypeOf(optionalSource.a).toEqualTypeOf<number | string>();

	// A readonly target key stays readonly, and the rest of the shape survives.
	const readonlyResult = objectAssign({a: 1} as {readonly a: number}, {b: 2});
	expectTypeOf(readonlyResult).toEqualTypeOf<{b?: number; readonly a: number}>();
	if (false) {
		// @ts-expect-error - `a` is still readonly.
		readonlyResult.a = 2;
	}
});

test('objectAssign() keeps the value type of an index-signature target', () => {
	// A key covered by an index signature is typed like reading it from the target, as in v1.3.0.
	const target: Record<string, number> = {other: 1};
	const result = objectAssign(target, {a: 'x'});
	expectTypeOf(result).toEqualTypeOf<{[x: string]: string | number; a: string | number}>();

	const headers: Record<string, string> = {accept: 'json'};
	const merged: Record<string, string | undefined> = objectAssign({...headers}, {'content-type': 'json'});
	assert.deepEqual(merged, {accept: 'json', 'content-type': 'json'});

	// A class-instance source is conservative, so a getter on its prototype is not claimed as copied.
	class Source {
		get a(): string {
			return 'from the prototype';
		}
	}

	const untouched: Record<string, number> = {other: 1};
	const copied = objectAssign(untouched, new Source());
	assert.deepEqual(Object.keys(copied), ['other']);
	assert.equal('a' in copied, false);

	// The runtime really does write the key when the source owns it.
	assert.deepEqual(Object.keys(objectAssign({other: 1}, {a: 'x'})), ['other', 'a']);
});

test('objectAssign() copies a class member that keyof cannot see', () => {
	// The note in the source says a `private` or `protected` member is invisible to `keyof`, so it is not checked, while `Object.assign()` does copy it over a target key, which the result then reports as the target's own narrower type. A `#private` field is not an own property and is not copied at all. None of the three is visible to `keyof`, so only the runtime can show this.
	class Source {
		readonly visible = 1;
		#secret = 'hidden';

		private written = 2;

		readWritten(): number {
			return this.written;
		}

		protected guarded = 3;

		read(): string {
			return this.#secret;
		}
	}

	const target = {visible: 0, written: 0} as {visible: number; written: number};
	objectAssign(target, new Source());

	assert.equal(target.visible, 1, 'the own field is copied over the target key');
	assert.equal(target.written, 2, 'a TypeScript private member compiles to an own property and is copied');
	assert.equal((target as Record<string, unknown>)['guarded'], 3, 'a protected member is an own property too');
	assert.equal(Object.hasOwn(target, '#secret'), false, 'a #private field is not an own property and is not copied');
});

test('objectAssign() types a prototype-carrying source as an ordinary merge', () => {
	// The note in the source says such a source is accepted and every other key of it is merged, with only the `__proto__` name dropped. The type has to agree, or a caller who builds one from a parsed body would have to cast to get at the keys that really do arrive.
	const record: Record<string, unknown> = {};
	const source = JSON.parse('{"__proto__":{"polluted":true},"b":2}') as Record<string, unknown>;

	const merged = objectAssign(record, source);

	expectTypeOf(merged['b']).toEqualTypeOf<unknown>();
	assert.deepEqual({...record}, {b: 2}, 'every other key of the source arrives');
	assert.equal(Object.getPrototypeOf(record), Object.prototype, 'and the target prototype is untouched');
});

test('objectAssign() does not assume a void-typed source is empty', () => {
	const target = {a: 1};
	const callback: () => void = () => ({a: 'overwritten'});
	const result = objectAssign(target, callback());

	assert.equal(result, target);
	assert.equal((result as {a: unknown}).a, 'overwritten');
	if (false) {
		// @ts-expect-error - a void-typed callback can return an object that replaces this number.
		result.a.toFixed(0);
	}
});

test('objectAssign() keeps the value type when merging two records', () => {
	const merged = objectAssign({} as Record<string, string>, {accept: 'json'} as Record<string, string>);
	const back: Record<string, string> = merged;
	expectTypeOf(merged).toEqualTypeOf<{[Key in string | number]: Key extends number ? string | undefined : string}>();
	assert.deepEqual(back, {accept: 'json'});
});

test('objectAssign() copies each source before reading the next source', () => {
	const target = {value: 0};
	const later = {
		get next() {
			return target.value;
		},
		['__proto__']: {},
	};

	const result = objectAssign(target, {value: 1}, later);
	assert.equal(result.next, 1);
	assert.equal(result.value, 1);
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
});

test('objectAssign() stops before reading later sources when an assignment throws', () => {
	const failure = new Error('Cannot write');
	const reads: string[] = [];
	const target = {
		get value() {
			return 0;
		},
		set value(_value: number) {
			throw failure;
		},
	};
	const later = {
		get next() {
			reads.push('next');
			return 2;
		},
		['__proto__']: {},
	};

	assert.throws(() => {
		objectAssign(target, {value: 1}, later);
	}, error => error === failure);
	assert.deepEqual(reads, []);
});

test('objectAssign() preserves earlier assignments when a later source getter throws', () => {
	const failure = new Error('Cannot read');
	const target = {value: 0};
	const later = {
		get next(): number {
			throw failure;
		},
		['__proto__']: {},
	};

	assert.throws(() => {
		objectAssign(target, {value: 1}, later);
	}, error => error === failure);
	assert.equal(target.value, 1);
});

test('objectAssign() writes each source property before reading the next property', () => {
	const target = {value: 0};
	const source = {
		value: 1,
		get next() {
			return target.value;
		},
		['__proto__']: {},
	};

	const result = objectAssign(target, source);
	assert.equal(result.next, 1);
	assert.equal(result.value, 1);
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
});

test('objectAssign() preserves earlier property writes when the same source getter throws', () => {
	const failure = new Error('Cannot read the next property');
	const target = {value: 0};
	const source = {
		value: 1,
		get next(): number {
			throw failure;
		},
		['__proto__']: {},
	};

	assert.throws(() => {
		objectAssign(target, source);
	}, error => error === failure);
	assert.equal(target.value, 1);
});

/* eslint-disable no-proto -- Verify the types and values of explicitly declared __proto__ data properties. */
test('objectAssign() does not advertise an ignored source-only __proto__ property', () => {
	const result = objectAssign({value: 1}, {['__proto__']: 'ignored', extra: 2});

	expectTypeOf(result).toEqualTypeOf<{value: number; extra?: number}>();
	if (false) {
		// @ts-expect-error - The skipped source key cannot supply a string property.
		result.__proto__?.toUpperCase();
	}

	assert.deepEqual(result, {value: 1, extra: 2});
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
	assert.equal(Object.hasOwn(result, '__proto__'), false);
});

test('objectAssign() keeps the type of an existing own __proto__ property', () => {
	const target = {['__proto__']: 17, value: 1};
	const result = objectAssign(target, {['__proto__']: 'ignored', extra: 2});

	expectTypeOf(result.__proto__).toEqualTypeOf<number>();
	assert.equal(result, target);
	assert.equal(result.__proto__, 17);
	assert.equal(Object.hasOwn(result, '__proto__'), true);
	assert.deepEqual(result, {['__proto__']: 17, value: 1, extra: 2});
});

test('objectAssign() preserves existing __proto__ values for interface and class sources', () => {
	interface InterfaceSource {
		__proto__: string;
		value: number;
		extra: number;
	}

	const interfaceSource: InterfaceSource = {['__proto__']: 'ignored', value: 2, extra: 3};
	const interfaceResult = objectAssign({['__proto__']: 17, value: 1}, interfaceSource);

	expectTypeOf(interfaceResult.__proto__).toEqualTypeOf<number>();
	expectTypeOf(interfaceResult.value).toEqualTypeOf<unknown>();
	if (false) {
		// @ts-expect-error - Interface source-only keys remain conservative.
		void interfaceResult.extra;
	}

	assert.deepEqual(interfaceResult, {['__proto__']: 17, value: 2, extra: 3});

	class ClassSource {
		__proto__ = 'ignored'; // eslint-disable-line unicorn/prefer-private-class-fields -- The public own property is the behavior under test.
		value = 2;
		extra = 3;
	}

	const classResult = objectAssign({['__proto__']: 17, value: 1}, new ClassSource());
	expectTypeOf(classResult.__proto__).toEqualTypeOf<number>();
	expectTypeOf(classResult.value).toEqualTypeOf<unknown>();
	if (false) {
		// @ts-expect-error - Class source-only keys remain conservative.
		void classResult.extra;
	}

	assert.deepEqual(classResult, {['__proto__']: 17, value: 2, extra: 3});
});

test('objectAssign() keeps a readonly own __proto__ property unchanged across sources', () => {
	const target = {['__proto__']: 17, value: 1} as {readonly __proto__: number; value: number};
	const result = objectAssign(target, {['__proto__']: 'ignored'}, {value: 2}, {['__proto__']: false});

	expectTypeOf(result).toEqualTypeOf<{readonly __proto__: number; value: number}>();
	if (false) {
		// @ts-expect-error - The existing property remains readonly.
		result.__proto__ = 18;
	}

	assert.deepEqual(result, {['__proto__']: 17, value: 2});
});

test('objectAssign() omits a skipped __proto__ key for a null-prototype target', () => {
	const target = Object.create(null) as {value?: number};
	const result = objectAssign(target, {['__proto__']: 'ignored', value: 2});

	expectTypeOf(result).toEqualTypeOf<{value?: number}>();
	assert.equal(Object.getPrototypeOf(result), null);
	assert.equal(Object.hasOwn(result, '__proto__'), false);
	assert.equal(result.value, 2);
});
/* eslint-enable no-proto -- Ends the targeted tests above. */

// Boundary: keys are compared exactly as `keyof` names them, which is how TypeScript compares them for `Object.assign()`'s own intersection. A source key spelled the other way, or carried by a numeric index signature, is a key of its own, so a conservative source contributes nothing and the target's declared types survive. The runtime still writes the property, which is the same gap TypeScript's own result has.
test('objectAssign() treats a numeric key of another spelling as an unshared key', () => {
	interface StringSpelledSource {
		'0': string;
	}

	const stringSpelledSource: StringSpelledSource = {'0': 'updated'};
	const target = {0: 1, kept: true} as {readonly 0: number; kept: boolean};
	const result = objectAssign(target, stringSpelledSource);

	expectTypeOf(result[0]).toEqualTypeOf<number>();
	expectTypeOf(result).toEqualTypeOf<{readonly 0: number; kept: boolean}>();
	if (false) {
		// @ts-expect-error - The target's readonly declaration survives an unshared source key.
		result[0] = 2;
	}

	assert.equal(result, target);
	assert.equal(result[0], 'updated');
	assert.deepEqual(result, {0: 'updated', kept: true});

	interface NumericSource {
		0: string;
	}

	const numericSource: NumericSource = {0: 'updated'};
	const stringResult = objectAssign({'0': 1, kept: true}, numericSource);
	expectTypeOf(stringResult).toEqualTypeOf<{'0': number; kept: boolean}>();
	assert.equal(stringResult['0'], 'updated');
	assert.deepEqual(stringResult, {'0': 'updated', kept: true});
});

test('objectAssign() leaves a numeric index signature source unmerged', () => {
	interface NumericIndexSource {
		[key: number]: string;
	}

	const source: NumericIndexSource = {0: 'updated'};
	const result = objectAssign({'0': 1, kept: true}, source);

	expectTypeOf(result['0']).toEqualTypeOf<number>();
	expectTypeOf(result.kept).toEqualTypeOf<boolean>();
	assert.deepEqual(result, {'0': 'updated', kept: true});

	const stringTarget = objectAssign({other: 1} as Record<string, number>, numericIndexSource());
	const numericTarget = objectAssign({1: 1} as Record<number, number>, stringIndexSource());

	expectTypeOf(stringTarget).toEqualTypeOf<{[x: string]: number}>();
	expectTypeOf(numericTarget).toEqualTypeOf<{[x: number]: number}>();
	assert.deepEqual(stringTarget, {other: 1, 0: 'updated'});
	assert.deepEqual(numericTarget, {1: 1, '0': 'updated'});

	function numericIndexSource(): NumericIndexSource {
		return {0: 'updated'};
	}

	function stringIndexSource(): StringIndexSource {
		return {'0': 'updated'};
	}
});

interface StringIndexSource {
	'0': string;
}

test('objectAssign() leaves non-finite key names of a numeric index signature source unmerged', () => {
	interface Source {
		[key: number]: string;
	}

	for (const key of [1, Infinity, -Infinity, NaN]) {
		const source: Source = {[key]: 'updated'};
		const result = objectAssign({
			'1': 1, Infinity: 2, '-Infinity': 3, NaN: 4,
		}, source);

		expectTypeOf(result['1']).toEqualTypeOf<number>();
		expectTypeOf(result.Infinity).toEqualTypeOf<number>();
		expectTypeOf(result['-Infinity']).toEqualTypeOf<number>();
		expectTypeOf(result.NaN).toEqualTypeOf<number>();
		assert.equal(result[String(key) as '1' | 'Infinity' | '-Infinity' | 'NaN'], 'updated');
		assert.equal(Object.keys(result).length, 4);
	}
});

test('objectAssign() already includes numeric alias values from ordinary record sources', () => {
	type StringSource = {'0': string};
	type NumericSource = {0: string};

	const stringSource: StringSource = {'0': 'updated'};
	const numericSource: NumericSource = {0: 'updated'};
	const numericTarget = objectAssign({0: 1}, stringSource);
	const stringTarget = objectAssign({'0': 1}, numericSource);
	const broadStringSource = objectAssign({0: 1}, stringSource as Record<string, string>);
	const broadNumericSource = objectAssign({'0': 1}, numericSource as Record<number, string>);

	// Type-fest's `ObjectMerge` matches the two spellings of a numeric key, so the source value is merged into the target's key.
	expectTypeOf(numericTarget[0]).toEqualTypeOf<number | string>();
	expectTypeOf(stringTarget['0']).toEqualTypeOf<number | string>();
	expectTypeOf(broadStringSource[0]).toEqualTypeOf<number | string | undefined>();
	expectTypeOf(broadNumericSource['0']).toEqualTypeOf<number | string | undefined>();
	assert.deepEqual(numericTarget, {0: 'updated'});
	assert.deepEqual(stringTarget, {'0': 'updated'});
	assert.deepEqual(broadStringSource, {0: 'updated'});
	assert.deepEqual(broadNumericSource, {'0': 'updated'});
});

test('objectAssign() merges a numeric index signature from an ordinary record source into non-finite numeric keys, except NaN', () => {
	// Type-fest's `ObjectMerge` reads `Infinity` and `-Infinity` as numeric keys, so the index signature's value is merged into them, with the `undefined` an index signature read adds. It does not read `NaN` as one, so its declared type survives, though the runtime overwrites it too. This is a known gap.
	for (const key of [Infinity, -Infinity, NaN]) {
		const source: Record<number, string> = {[key]: 'updated'};
		const result = objectAssign({Infinity: 1, '-Infinity': 2, NaN: 3}, source);

		expectTypeOf(result.Infinity).toEqualTypeOf<number | string | undefined>();
		expectTypeOf(result['-Infinity']).toEqualTypeOf<number | string | undefined>();
		expectTypeOf(result.NaN).toEqualTypeOf<number>();
		assert.equal(result[String(key) as 'Infinity' | '-Infinity' | 'NaN'], 'updated');
	}
});

test('objectAssign() includes collisions between partially overlapping template index signatures', () => {
	const target: {[key: `item-${string}`]: number} = {'item-one': 1};
	const source: {[key: `${string}-one`]: string} = {'item-one': 'updated'};
	const result = objectAssign(target, source);

	expectTypeOf(result['item-one']).toEqualTypeOf<string | number | undefined>();
	assert.deepEqual(result, {'item-one': 'updated'});
});

test('objectAssign() leaves partially overlapping template index signatures of an interface source unmerged', () => {
	interface Source {
		[key: `${string}-one`]: string;
	}

	const target: {[key: `item-${string}`]: number} = {'item-one': 1};
	const source: Source = {'item-one': 'updated'};
	const result = objectAssign(target, source);

	// An interface has no implicit index signature, so it takes the conservative path, where the signatures do not overlap as key sets. Reading an index signature adds the `undefined` of `noUncheckedIndexedAccess`.
	expectTypeOf(result['item-one']).toEqualTypeOf<number | undefined>();
	assert.deepEqual(result, {'item-one': 'updated'});
});

// Boundary: an index signature already types a missing key as present, so a key it covers is not made optional for the rare source that does not copy it. See `SharedOptionalKeys`.
test('objectAssign() types a getter source key covered only by a target index signature like an index signature read', () => {
	class Source {
		get value() {
			return 1;
		}
	}

	const source: {value: number} = new Source();
	const target: Record<string, number> = {};
	const result = objectAssign(target, source);

	// With `noUncheckedIndexedAccess`, the target read adds `undefined` and this does not. That is the known cost of this boundary.
	expectTypeOf(result.value).toEqualTypeOf<number>();
	assert.equal(result.value, undefined);
	assert.equal(Object.hasOwn(result, 'value'), false);
});

test('objectAssign() types a non-enumerable source key covered only by a target index signature like an index signature read', () => {
	const source = {value: 1};
	Object.defineProperty(source, 'value', {enumerable: false});
	const target: Record<string, number> = {};
	const result = objectAssign(target, source);

	expectTypeOf(result.value).toEqualTypeOf<number>();
	assert.equal(result.value, undefined);
	assert.equal(Object.hasOwn(result, 'value'), false);
});

test('objectAssign() preserves required and optional declarations beside a string index signature', () => {
	class Source {
		get value() {
			return 'from prototype';
		}
	}

	for (const source of [new Source(), {value: 'copied'}] as Array<{value: string}>) {
		const required = {value: 1} as {readonly value: number; [key: string]: number | string};
		const optional = {} as {value?: number; [key: string]: number | string | undefined};
		const requiredResult = objectAssign(required, source);
		const optionalResult = objectAssign(optional, source);

		expectTypeOf(requiredResult).toExtend<{readonly value: number | string}>();
		expectTypeOf(requiredResult.value).toEqualTypeOf<number | string>();
		expectTypeOf(optionalResult.value).toEqualTypeOf<number | string | undefined>();
		if (false) {
			// @ts-expect-error - A required target declaration remains readonly.
			requiredResult.value = 2;
			// @ts-expect-error - The optional declaration does not guarantee presence.
			const guaranteed: {value: number | string} = optionalResult;
			void guaranteed;
		}

		assert.equal(requiredResult.value, Object.hasOwn(source, 'value') ? 'copied' : 1);
		assert.equal(optionalResult.value, Object.hasOwn(source, 'value') ? 'copied' : undefined);
		assert.equal(Object.hasOwn(requiredResult, 'value'), true);
		assert.equal(Object.hasOwn(optionalResult, 'value'), Object.hasOwn(source, 'value'));
	}
});

test('objectAssign() preserves required and optional declarations beside a numeric index signature', () => {
	const hidden = {0: 'hidden'};
	Object.defineProperty(hidden, '0', {enumerable: false});

	for (const source of [hidden, {0: 'copied'}]) {
		const required = {0: 1} as {readonly 0: number; [key: number]: number | string};
		const optional = {} as {0?: number; [key: number]: number | string | undefined};
		const requiredResult = objectAssign(required, source);
		const optionalResult = objectAssign(optional, source);

		expectTypeOf(requiredResult).toExtend<{readonly 0: number | string}>();
		expectTypeOf(requiredResult[0]).toEqualTypeOf<number | string>();
		expectTypeOf(optionalResult[0]).toEqualTypeOf<number | string | undefined>();
		if (false) {
			// @ts-expect-error - The numeric key is shared, so the required declaration stays readonly.
			requiredResult[0] = 2;
			// @ts-expect-error - An optional numeric declaration does not guarantee presence.
			const guaranteed: {0: number | string | undefined} = optionalResult;
			void guaranteed;
		}

		assert.equal(requiredResult[0], Object.propertyIsEnumerable.call(source, '0') ? 'copied' : 1);
		assert.equal(optionalResult[0], Object.propertyIsEnumerable.call(source, '0') ? 'copied' : undefined);
		assert.equal(Object.hasOwn(requiredResult, 0), true);
		assert.equal(Object.hasOwn(optionalResult, 0), Object.propertyIsEnumerable.call(source, '0'));
	}
});

test('objectAssign() preserves required and optional declarations beside a symbol index signature', () => {
	const key = Symbol('value');
	const hidden = {[key]: 'hidden'};
	Object.defineProperty(hidden, key, {enumerable: false});

	for (const source of [hidden, {[key]: 'copied'}]) {
		const required = {[key]: 1} as {readonly [key]: number; [property: symbol]: number | string};
		const optional = {} as {[key]?: number; [property: symbol]: number | string | undefined};
		const requiredResult = objectAssign(required, source);
		const optionalResult = objectAssign(optional, source);

		expectTypeOf(requiredResult).toExtend<{readonly [key]: number | string}>();
		expectTypeOf(requiredResult[key]).toEqualTypeOf<number | string>();
		expectTypeOf(optionalResult[key]).toEqualTypeOf<number | string | undefined>();
		if (false) {
			// @ts-expect-error - A required symbol declaration remains readonly.
			requiredResult[key] = 2;
			// @ts-expect-error - An optional symbol declaration does not guarantee presence.
			const guaranteed: {[key]: number | string} = optionalResult;
			void guaranteed;
		}

		assert.equal(requiredResult[key], Object.propertyIsEnumerable.call(source, key) ? 'copied' : 1);
		assert.equal(optionalResult[key], Object.propertyIsEnumerable.call(source, key) ? 'copied' : undefined);
		assert.equal(Object.hasOwn(requiredResult, key), true);
		assert.equal(Object.hasOwn(optionalResult, key), Object.propertyIsEnumerable.call(source, key));
	}
});
