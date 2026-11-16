import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {objectUpdate} from '../source/index.js';

type User = {
	name: string;
	age: number;
};

test('objectUpdate()', () => {
	const user: User = {name: 'Sindre', age: 41};

	const result = objectUpdate(user, {age: 42});

	// Mutates in place and returns the same target with the unchanged type
	assert.equal(result, user);
	expectTypeOf(result).toEqualTypeOf<User>();
	assert.deepEqual(result, {name: 'Sindre', age: 42});

	// A partial update may omit keys
	objectUpdate(user, {name: 'Sindre Sorhus'});
	assert.equal(user.name, 'Sindre Sorhus');

	// @ts-expect-error - update sources must have at least one statically known key
	objectUpdate(user, {});

	// @ts-expect-error - 'email' does not exist on the target
	objectUpdate(user, {email: 'sindre@example.com'});

	// @ts-expect-error - 'age' must be a number
	objectUpdate(user, {age: '42'});

	// @ts-expect-error - required keys cannot be set to `undefined`
	objectUpdate(user, {age: undefined});
});

test('objectUpdate() rejects unknown keys from a pre-typed variable', () => {
	const user: User = {name: 'Sindre', age: 41};

	// Unlike a bare `Partial<User>` constraint, this is caught even though the source is a variable rather than an object literal.
	const patch = {nickname: 'sindre'};

	// @ts-expect-error - 'nickname' does not exist on the target
	objectUpdate(user, patch);
});

test('objectUpdate() rejects a pre-typed source that may write `undefined` to a required key', () => {
	const user: User = {name: 'Sindre', age: 41};
	const patch: {age?: number | undefined} = {age: undefined};

	// @ts-expect-error - `age` may hold `undefined`, which the required target property does not allow.
	objectUpdate(user, patch);
});

test('objectUpdate() checks writing `undefined` against whether each property declares it', () => {
	// An optional property can hold `undefined` only when it declares `| undefined`, so the check for writing `undefined` follows that, as TypeScript itself does.
	if (false) {
		const user = {} as User;

		// A `Partial` over required keys cannot hold `undefined`, so it is a safe update.
		const partialUser = {} as Partial<User>;
		objectUpdate(user, partialUser);

		// One that declares `| undefined` accepts it.
		const explicitTarget = {} as {a?: number | undefined};
		objectUpdate(explicitTarget, {a: undefined});

		// A required target property that declares `| undefined` accepts an explicit undefined, from a literal or a pre-typed source.
		const requiredUndefinedTarget = {} as {a: number | undefined};
		const explicitSource = {} as {a?: number | undefined};
		objectUpdate(requiredUndefinedTarget, explicitSource);
		objectUpdate(requiredUndefinedTarget, {a: undefined});

		// The same through the other spelling of a numeric key.
		const numericTarget = {} as {0?: number};
		// @ts-expect-error - `0` cannot hold `undefined`.
		objectUpdate(numericTarget, {'0': undefined});

		const stringTarget = {} as {'0'?: number};
		// @ts-expect-error - `'0'` cannot hold `undefined`.
		objectUpdate(stringTarget, {0: undefined});

		const explicitNumericTarget = {} as {0?: number | undefined};
		objectUpdate(explicitNumericTarget, {'0': undefined});

		// Beside a numeric index signature, the string spelling is still checked on the declared property, not on the signature's wider value type.
		const mixedTarget = {} as {[key: number]: number | undefined; 0?: number};
		// @ts-expect-error - `0` cannot hold `undefined`, even though the index signature's value can.
		objectUpdate(mixedTarget, {'0': undefined});

		const mixedStrictTarget = {} as {[key: number]: number; 0?: number};
		// @ts-expect-error - `0` cannot hold `undefined`.
		objectUpdate(mixedStrictTarget, {'0': undefined});

		// One that declares `| undefined` accepts it, even beside an index signature.
		const mixedExplicitTarget = {} as {[key: number]: number | undefined; 0?: number | undefined};
		objectUpdate(mixedExplicitTarget, {'0': undefined});

		// A record whose values cannot be `undefined` rejects it.
		const recordTarget = {} as Record<string, number>;
		// @ts-expect-error - the index signature's value cannot be `undefined`.
		objectUpdate(recordTarget, {a: undefined});
	}
});

test('objectUpdate() rejects broad object patch variables', () => {
	const user: User = {name: 'Sindre', age: 41};
	const objectPatch: object = {age: '42', email: 'sindre@example.com'};
	const emptyShapePatch: {} = {age: '42', email: 'sindre@example.com'};

	// @ts-expect-error - broad object types erase the keys and values that must be checked
	objectUpdate(user, objectPatch);

	// @ts-expect-error - broad empty object types erase the keys and values that must be checked
	objectUpdate(user, emptyShapePatch);
});

test('objectUpdate() rejects readonly properties', () => {
	const entity: {readonly id: number; name: string} = {id: 1, name: 'Sindre'};

	// A writable property can be updated
	objectUpdate(entity, {name: 'Sindre Sorhus'});
	assert.equal(entity.name, 'Sindre Sorhus');

	// @ts-expect-error - 'id' is readonly and cannot be updated
	objectUpdate(entity, {id: 2});
});

test('objectUpdate() works with optional keys', () => {
	const config: {timeout?: number | undefined; retries: number} = {retries: 3};

	// An optional key may be set to `undefined` or omitted entirely
	objectUpdate(config, {timeout: undefined});
	assert.equal(config.timeout, undefined);

	const patch: {timeout?: number} = {timeout: 1};
	objectUpdate(config, patch);
	assert.equal(config.timeout, 1);

	objectUpdate(config, {retries: 5});
	assert.deepEqual(config, {timeout: 1, retries: 5});
});

test('objectUpdate() constrains a union-typed property to its members', () => {
	const toggle: {state: 'on' | 'off'} = {state: 'on'};

	objectUpdate(toggle, {state: 'off'});
	assert.equal(toggle.state, 'off');

	// @ts-expect-error - 'maybe' is not a member of the union
	objectUpdate(toggle, {state: 'maybe'});
});

test('objectUpdate() rejects variant-specific union updates', () => {
	type Shape = {kind: 'a'; value: number; x: number} | {kind: 'b'; value: number; y: number};
	const shape = {kind: 'a', value: 1, x: 1} as Shape;

	// @ts-expect-error - updating the discriminant could make the current value invalid
	objectUpdate(shape, {kind: 'a'});

	// @ts-expect-error - 'x' only exists on one union variant
	objectUpdate(shape, {x: 2});
});

test('objectUpdate() requires whole nested objects', () => {
	const node = {position: {x: 1, y: 2}};

	// The update is shallow, so a nested object must be supplied in full
	objectUpdate(node, {position: {x: 9, y: 9}});
	assert.deepEqual(node.position, {x: 9, y: 9});

	// @ts-expect-error - 'y' is missing from the nested object
	objectUpdate(node, {position: {x: 9}});
});

test('objectUpdate() works with numeric keys', () => {
	const slots = {0: 'a', 1: 'b'};

	objectUpdate(slots, {0: 'z'});
	assert.equal(slots[0], 'z');

	// @ts-expect-error - value must be a string
	objectUpdate(slots, {1: 5});
});

test('objectUpdate() works with symbol keys', () => {
	const key: unique symbol = Symbol('key');
	const target = {[key]: 'a'} as {[key]: string};

	objectUpdate(target, {[key]: 'b'});
	assert.equal(target[key], 'b');

	// @ts-expect-error - value must be a string
	objectUpdate(target, {[key]: 1});
});

test('objectUpdate() checks every key of a union source', () => {
	// `keyof` a union is the intersection of its members' keys, so a key only some branches have has to be checked per branch, since a source branch can set it to a string that `Object.assign()` then writes over the number.
	const job = (): {mode: 'once' | 'repeat'; intervalMs: number} => ({mode: 'once', intervalMs: 1000});

	const wrongValue = (): {mode: 'once'; intervalMs: string} | {mode: 'repeat'} => ({mode: 'once', intervalMs: 'soon'});
	if (false) {
		// @ts-expect-error - The 'once' branch sets `intervalMs` to a string.
		objectUpdate(job(), wrongValue());
	}

	const wrongOnOtherBranch = (): {mode: 'once'} | {mode: 'repeat'; intervalMs: string} => ({mode: 'repeat', intervalMs: 'soon'});
	if (false) {
		// @ts-expect-error - The 'repeat' branch sets `intervalMs` to a string.
		objectUpdate(job(), wrongOnOtherBranch());
	}

	// A union whose branches are all valid still applies. The target is held in a variable so the assertion reads the object that was updated.
	const good = (): {mode: 'once'; intervalMs: number} | {mode: 'repeat'} => ({mode: 'once', intervalMs: 2000});
	const jobTarget = job();
	objectUpdate(jobTarget, good());
	assert.deepEqual({...jobTarget}, {mode: 'once', intervalMs: 2000});
});

test('objectUpdate() checks readonly and undefined for a union source', () => {
	// Both guards key off the source's declared keys, so a key that only some branches of a union have must still be checked.
	const target = (): {mode: 'a' | 'b'; n: number} => ({mode: 'a', n: 1});
	const readonlyTarget = (): {mode: 'a' | 'b'; readonly id: number; n: number} => ({mode: 'a', id: 1, n: 1});

	const setsUndefined = (): {mode: 'a'; n: number | undefined} | {mode: 'b'} => ({mode: 'a', n: undefined});
	if (false) {
		// @ts-expect-error - The 'a' branch would set a required property to `undefined`.
		objectUpdate(target(), setsUndefined());
	}

	const setsReadonly = (): {mode: 'a'; id: number} | {mode: 'b'} => ({mode: 'a', id: 2});
	if (false) {
		// @ts-expect-error - The 'a' branch would write a `readonly` property.
		objectUpdate(readonlyTarget(), setsReadonly());
	}
});

test('objectUpdate() checks an interface union source', () => {
	// Interfaces and a conditional type both resolve to a union, so they take the same check as the type-literal cases above.
	// An interface has no implicit index signature, which is the point of this test.
	interface PatchOne {
		kind: 'x';
		a: string;
	}

	interface PatchTwo {
		kind: 'y';
		b: number;
	}

	const target: {kind: 'x' | 'y'; a: number} = {kind: 'x', a: 1};
	const union = (): PatchOne | PatchTwo => ({kind: 'x', a: 'text'});

	if (false) {
		// @ts-expect-error - The 'x' branch sets `a` to a string.
		objectUpdate(target, union());
	}

	// A union whose branches all fit still applies. A separate copy is updated, so the assertion reads the object the update ran against.
	const good = (): {kind: 'x'; a: number} | {kind: 'y'} => ({kind: 'x', a: 2});
	const goodTarget = {...target};
	objectUpdate(goodTarget, good());
	assert.deepEqual({...goodTarget}, {kind: 'x', a: 2});

	// A conditional type resolves to a union of the same shape, and is checked too.
	type Conditional<Value> = Value extends 1 ? {tag: 'a'; v: string} : {tag: 'b'; v: string};
	const conditional = (): Conditional<1> | Conditional<2> => ({tag: 'a', v: 'x'});
	const conditionalTarget: {tag: 'a' | 'b'; v: number} = {tag: 'a', v: 1};
	if (false) {
		// @ts-expect-error - Both branches set `v` to a string.
		objectUpdate(conditionalTarget, conditional());
	}
});

test('objectUpdate() accepts a numeric key against a string index target', () => {
	// `0` and `'0'` are the same runtime key, so both spellings apply, and an unknown key is still rejected.
	const record: Record<string, boolean> = {a: true};
	objectUpdate(record, {0: false});
	assert.equal(record['0'], false);

	const numeric: Record<number, string> = {0: 'a'};
	objectUpdate(numeric, {'0': 'z'});
	assert.equal(numeric[0], 'z');

	// A string index target legitimately accepts any string key, since `Object.assign()` would write it and the index signature covers it. A named target still rejects an unknown key.
	const named = {a: 1};
	// @ts-expect-error - `missing` is not a key of the target at all.
	objectUpdate(named, {missing: true});
});

test('objectUpdate() checks a numeric key spelled either way against the key it names', () => {
	// A type-literal target gets an implicit index signature whose value type is the union of every property type, so the value is not read through that signature, which would accept a value the target rejects. The key itself is what names the value, in either spelling.
	const slots: {0: string; 1: number} = {0: 'a', 1: 0};

	objectUpdate(slots, {0: 'z'});
	objectUpdate(slots, {'0': 'z'});
	assert.equal(slots[0], 'z');

	// @ts-expect-error - `0` holds a string.
	objectUpdate(slots, {'0': 1});
	// @ts-expect-error - `1` holds a number.
	objectUpdate(slots, {'1': 'x'});
	// @ts-expect-error - `'7'` is not a key of the target.
	objectUpdate(slots, {'7': 'x'});

	// A required key cannot be set to `undefined`, whichever spelling writes it.
	const partly: {0: string; 1: number | undefined} = {0: 'a', 1: undefined};
	// @ts-expect-error - `0` is a required string.
	objectUpdate(partly, {'0': undefined});
});

test('objectUpdate() accepts both spellings of a numeric key on an interface', () => {
	// An interface has no implicit index signature, so the string spelling of a valid key has to be accepted without one.
	// The whole point is the interface, which unlike a type alias has no implicit index signature.
	interface Slots {
		0: string;
		count: number;
	}

	const slots: Slots = {0: 'a', count: 1};

	objectUpdate(slots, {'0': 'z'});
	assert.equal(slots[0], 'z');

	// @ts-expect-error - `0` holds a string.
	objectUpdate(slots, {'0': 1});
	// @ts-expect-error - `'missing'` is not a key of the target.
	objectUpdate(slots, {'missing': 1});
});

test('objectUpdate() does not let a source replace the target prototype', () => {
	// `Object.assign()` writes with `[[Set]]`, so an own `__proto__` on the source invokes the inherited setter and swaps the target's prototype instead of writing a property. The object would end up with a foreign prototype and no own keys at all, while the call site believes a `__proto__` property was written. A name like that is not a partial update, so it is skipped the way `keyIn()` and `objectHasIn()` refuse it outright.
	const record: Record<string, object> = {};
	const source = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, object>;

	objectUpdate(record, source);
	assert.deepEqual(Object.keys(record), []);
	assert.equal(Object.getPrototypeOf(record), Object.prototype);
	assert.equal(({} as Record<string, unknown>)['polluted'], undefined);

	// A named key still updates, and so does an own property that merely shares the name.
	const target = {a: 1, nested: {polluted: false}};
	objectUpdate(target, {nested: {polluted: true}});
	assert.deepEqual(target, {a: 1, nested: {polluted: true}});
});

test('objectUpdate() accepts exactly what a direct assignment accepts', () => {
	// Every verdict below is the one plain TypeScript gives for `target.key = value`, so a reader can check the pair side by side. A `@ts-expect-error` that stops being used is a verdict change.
	const named = {a: 1, b: 'x'};
	objectUpdate(named, {a: 2});
	objectUpdate(named, {a: 2}); // Both spellings name the same runtime key.
	objectUpdate(named, {b: 'y'});
	// @ts-expect-error - wrong value type
	objectUpdate(named, {a: 'x'});
	// @ts-expect-error - unknown key
	objectUpdate(named, {c: true});

	const optional: {a?: number; b: string} = {b: 'x'};
	objectUpdate(optional, {b: 'y'});
	objectUpdate(optional, {a: 2});
	// @ts-expect-error - `a` cannot hold `undefined`, and plain TypeScript rejects it too.
	objectUpdate(optional, {a: undefined});

	const recordString: Record<string, number> = {a: 1};
	objectUpdate(recordString, {a: 2});
	objectUpdate(recordString, {anything: 2});
	objectUpdate(recordString, {0: 2});
	// @ts-expect-error - the index signature holds numbers
	objectUpdate(recordString, {a: 'x'});

	const recordNumber: Record<number, string> = {0: 'a'};
	objectUpdate(recordNumber, {0: 'b'});
	objectUpdate(recordNumber, {'0': 'b'});
	// @ts-expect-error - not a numeric index
	objectUpdate(recordNumber, {abc: 'b'});

	const readonlyTarget: {readonly id: number; name: string} = {id: 1, name: 'x'};
	objectUpdate(readonlyTarget, {name: 'y'});
	// @ts-expect-error - readonly key
	objectUpdate(readonlyTarget, {id: 2});

	const key = Symbol('s');
	const symbolTarget: {[key: symbol]: string} = {[key]: 'a'};
	objectUpdate(symbolTarget, {[key]: 'b'});
	// @ts-expect-error - the index signature holds strings
	objectUpdate(symbolTarget, {[key]: 1});

	const slots: {0: string; 1: number} = {0: 'a', 1: 0};
	objectUpdate(slots, {0: 'z'});
	objectUpdate(slots, {'0': 'z'});
	objectUpdate(slots, {1: 5});
	// @ts-expect-error - `0` holds a string
	objectUpdate(slots, {'0': 1});
	// @ts-expect-error - `1` holds a number
	objectUpdate(slots, {'1': 'x'});
	// @ts-expect-error - `7` is not a key of the target
	objectUpdate(slots, {'7': 'x'});
	// @ts-expect-error - `7` is not a key of the target
	objectUpdate(slots, {7: 'x'});

	const stringIndexed: {[index: string]: number; known: number} = {known: 1};
	objectUpdate(stringIndexed, {known: 2});
	objectUpdate(stringIndexed, {other: 2});
	// @ts-expect-error - the index signature holds numbers
	objectUpdate(stringIndexed, {other: 'x'});

	const nested = {position: {x: 1, y: 2}};
	objectUpdate(nested, {position: {x: 9, y: 9}});
	// @ts-expect-error - the nested object is replaced whole
	objectUpdate(nested, {position: {x: 9}});

	const withUndefined: {a: number | undefined} = {a: undefined};
	objectUpdate(withUndefined, {a: 1});
	objectUpdate(withUndefined, {a: undefined});
});

test('objectUpdate() accepts a nested value a direct assignment accepts', () => {
	// The excess-property check does not demand exactness inside a nested value, so a pre-typed value with an extra property is accepted. A direct assignment accepts it, so the update has to as well.
	const node = {position: {x: 1, y: 2}};
	const deepValue: {x: number; y: number; z: number} = {x: 9, y: 9, z: 9};
	const widerValue: {x: number; y: number; z?: number} = {x: 9, y: 9};

	node.position = deepValue;
	assert.deepEqual(objectUpdate(node, {position: deepValue}), {position: {x: 9, y: 9, z: 9}});
	assert.deepEqual(objectUpdate(node, {position: widerValue}), {position: {x: 9, y: 9}});

	// The nested value is still replaced whole, so a partial one is still rejected.
	// @ts-expect-error - `z` is missing from the nested object
	objectUpdate(node, {position: {x: 9}});
	// @ts-expect-error - `x` holds a number
	objectUpdate(node, {position: {x: 'z', y: 9}});
	// @ts-expect-error - `position` is an object, not a number
	objectUpdate(node, {position: 1});
});

test('objectUpdate() survives a nullish source the way Object.assign does', () => {
	// `Object.hasOwn()` throws for `null` and `undefined`, and the source is unchecked when it is typed `any`, which is what `JSON.parse()` returns. `Object.assign()` copies nothing for those two without complaining, so a parsed body of `null`, or the absence of one, must not crash it.
	// A parsed body really can be `null`.
	const parsedNull: any = JSON.parse('null');
	// And so can the absence of one.
	const parsedUndefined: any = undefined;

	assert.deepEqual(objectUpdate({a: 1}, parsedNull), {a: 1});
	assert.deepEqual(objectUpdate({a: 1}, parsedUndefined), {a: 1});

	// A real update still applies afterwards.
	const updated: Record<string, unknown> = {a: 1};
	objectUpdate(updated, {b: 2});
	assert.deepEqual(updated, {a: 1, b: 2});
});

// Built by a call, so control-flow analysis cannot narrow it to the keys the initializer sets.
function makeIndexed(): {[key: string]: number; readonly locked: number} {
	return {locked: 1, other: 2};
}

test('objectUpdate() writes through an index signature but not a readonly key', () => {
	// `WritableKeysOf` subtracts a literal from the target's own key set, and for a target that also has an index signature that key set is just `string`, so the subtraction cannot remove `locked`, and the readonly check has to come from the target naming the key itself. `WritableKeysOf` also cannot read a modifier through an `unknown` value type, so it would report every key of a `Record<string, unknown>` target as readonly.
	const indexed = makeIndexed();
	// @ts-expect-error - `locked` is readonly, exactly as a direct assignment is.
	indexed.locked = 2;

	// @ts-expect-error - `locked` is readonly, in its string spelling too.
	objectUpdate(indexed, {locked: 2});

	// @ts-expect-error - `locked` is readonly, in its string spelling too.
	objectUpdate(indexed, {'locked': 2});

	// Any other key the index signature covers is writable, and its value type is still checked.
	objectUpdate(indexed, {other: 2});
	// @ts-expect-error - the index signature holds numbers
	objectUpdate(indexed, {other: 'x'});

	// A `Record<string, unknown>` target accepts a write through its index signature.
	const record: Record<string, unknown> = {a: 1};
	objectUpdate(record, {b: 'x'});
	assert.deepEqual(record, {a: 1, b: 'x'});
});

// Built by a call, so control-flow analysis cannot narrow it to the keys the initializer sets.
function makeSlots(): {[key: number]: string; 0: 'a' | 'b'} {
	return {0: 'a'};
}

test('objectUpdate() checks a numeric key against the key the target declares', () => {
	// A target may declare a numeric-literal key beside its own index signature, and `Target[0]` is the property the target declares while `Target[number]` is the signature. Reading the signature would widen `{0: 'a' | 'b'}` to `string`, so the string spelling of the key is checked against the declared property, the same as the numeric one.
	// Built by a call, so control-flow analysis cannot narrow it away.
	const slots = makeSlots();

	// @ts-expect-error - `0` is typed `'a' | 'b'` by the declared key.
	objectUpdate(slots, {'0': 'z'});

	// @ts-expect-error - the index signature holds strings.
	objectUpdate(slots, {'1': 2});
	objectUpdate(slots, {'1': 'z'});

	// A target with only the index signature checks both spellings against the signature.
	const record: Record<number, string> = {0: 'a'};
	objectUpdate(record, {0: 'z'});
	objectUpdate(record, {'0': 'z'});
	assert.equal(record[0], 'z');
	// @ts-expect-error - the index signature holds strings
	objectUpdate(record, {'0': 2});
});

// Built by a call, so control-flow analysis cannot narrow it to the keys the initializer sets.
function makeGetter(): {get value(): number} {
	return {
		get value() {
			return 1;
		},
	};
}

test('objectUpdate() accepts exactly what a direct assignment accepts, for a second batch of shapes', () => {
	// The same pair-by-pair rule as the batch above, over the shapes that reach a different branch of the checker: a symbol index signature, a literal one, a method, a getter with no setter, an optional readonly property, a tuple, a `Date` property, a `Map` target, a readonly source, an intersection source, and a nested record.

	// Does `objectUpdate` accept exactly what a direct assignment accepts, for a second batch of shapes?
	const key = Symbol('k');

	const symbolIndexed: {[k: symbol]: number} = {[key]: 1};
	objectUpdate(symbolIndexed, {[key]: 2});
	// @ts-expect-error - the index signature holds numbers
	objectUpdate(symbolIndexed, {[key]: 'x'});

	const literalIndexed: Record<'a' | 'b', number> = {a: 1, b: 2};
	objectUpdate(literalIndexed, {a: 3});
	// @ts-expect-error - the index signature holds numbers
	objectUpdate(literalIndexed, {a: 'x'});

	const withMethod = {
		run() {
			return 1;
		},
		count: 0,
	};
	objectUpdate(withMethod, {count: 1});
	// A method is a writable property, exactly as `withMethod.run = …` is, so the update accepts it too.
	withMethod.run = () => 2;
	objectUpdate(withMethod, {run: () => 2});

	const withGetter = {
		get value(): number {
			return 1;
		},
	};
	// A getter with no setter is a readonly key, and the runtime `Object.assign()` throws for one, so the type rejects the update and the runtime refuses it the same way. A `declare const` cannot live inside a function body, so the value is built by a call to keep it out of reach of the assertions below.
	if (false) {
		// @ts-expect-error - there is no setter, so plain TypeScript rejects the write too
		withGetter.value = 2;

		// @ts-expect-error - `value` is readonly
		objectUpdate(withGetter, {value: 1});

		// @ts-expect-error - `count` is not a key of the target
		objectUpdate(withGetter, {count: 1});
	}

	assert.throws(() => {
		Object.assign(makeGetter(), {value: 2});
	}, TypeError);

	const optionalReadonly: {readonly a?: number; b: string} = {b: 'x'};
	objectUpdate(optionalReadonly, {b: 'y'});
	// @ts-expect-error - `a` is readonly
	objectUpdate(optionalReadonly, {a: 1});

	const tupleTarget: [number, string] = [1, 'a'];
	objectUpdate(tupleTarget, {0: 2});
	// @ts-expect-error - the second element holds a string
	objectUpdate(tupleTarget, {1: 2});

	const dateTarget = {at: new Date(0)};
	objectUpdate(dateTarget, {at: new Date(1)});
	// @ts-expect-error - `at` holds a `Date`
	objectUpdate(dateTarget, {at: 1});

	const mapTarget = new Map([['a', 1]]);
	// @ts-expect-error - a `Map` is not a partial-update target
	objectUpdate(mapTarget, {a: 2});

	const sourceWithReadonly = {a: 1} as {readonly a: number};
	const namedTarget = {a: 0, b: 0};
	objectUpdate(namedTarget, sourceWithReadonly);

	const intersectionSource = {a: 1} as {a: number} & {a: number};
	objectUpdate(namedTarget, intersectionSource);
	// @ts-expect-error - `b` holds a number on the target
	objectUpdate(namedTarget, {a: 1, b: 'x'} as {a: number} & {b: string});

	const nestedRecord: {config: Record<string, number>} = {config: {a: 1}};
	objectUpdate(nestedRecord, {config: {b: 2}});
	// @ts-expect-error - the value must be a `Record<string, number>`
	objectUpdate(nestedRecord, {config: {b: 'x'}});
});

test('objectUpdate() accepts a generic target narrowed to a concrete type', () => {
	// A target that is still a type parameter is rejected, because the shape a source is checked against cannot be resolved. Narrowing it to a concrete type at the call site is the way out.
	function narrow<T extends object>(target: T) {
		return objectUpdate(target as Record<string, unknown>, {key: 1});
	}

	assert.deepEqual(narrow({a: 1}), {a: 1, key: 1});

	// `object as object` does not help: `keyof object` is `never`, so every key is then one the target does not declare.
	// @ts-expect-error - `keyof object` is `never`, so `key` is a key the target does not have.
	objectUpdate({} as object, {key: 1});
});

// Built by a call, so control-flow analysis cannot narrow them to the keys the initializer sets.
function makeReadonlyNumeric(): {readonly 0: 'a' | 'b'; [key: number]: string} {
	return {0: 'a', 1: 'x'};
}

function makeReadonlyNamed(): {readonly locked: number; [key: string]: number} {
	return {locked: 1, other: 2};
}

function makeReadonlyOptional(): {readonly a?: number; b: string} {
	return {b: 'x'};
}

function makeReadonlyNumericKey(): {readonly 1: string; 2: number} {
	return {1: 'a', 2: 5};
}

function makeWithIndexKey(): {1: 'literal'; [key: string]: 'literal' | 'index'} {
	return {1: 'literal'};
}

declare const readonlyNumeric: {readonly 0: 'a' | 'b'; [key: number]: string};
declare const readonlyNamed: {readonly locked: number; [key: string]: number};
declare const readonlyOptional: {readonly a?: number; b: string};
declare const withIndexKey: {1: 'literal'; [key: string]: 'literal' | 'index'};

test('objectUpdate() rejects a readonly key beside an index signature of the same kind', () => {
	// `keyof` cannot subtract a literal from a target's own key set once it also has an index signature, so the readonly check has to come from the target naming the key itself.
	if (false) {
		// @ts-expect-error - `0` is readonly, exactly as a direct assignment is.
		readonlyNumeric[0] = 'z';

		// @ts-expect-error - `0` is readonly, in the numeric spelling.
		objectUpdate(readonlyNumeric, {0: 'z'});

		// @ts-expect-error - `0` is readonly, in the string spelling.
		objectUpdate(readonlyNumeric, {'0': 'z'});

		// @ts-expect-error - `locked` is readonly.
		objectUpdate(readonlyNamed, {locked: 2});

		// @ts-expect-error - the index signature holds numbers.
		objectUpdate(readonlyNamed, {other: 'x'});

		// @ts-expect-error - `a` is readonly.
		objectUpdate(readonlyOptional, {a: 1});
	}

	// Every other key the index signature covers is writable.
	assert.deepEqual(objectUpdate(makeReadonlyNumeric(), {1: 'z'}), {0: 'a', 1: 'z'});
	assert.deepEqual(objectUpdate(makeReadonlyNamed(), {other: 2}), {locked: 1, other: 2});
	assert.deepEqual(objectUpdate(makeReadonlyOptional(), {b: 'y'}), {b: 'y'});
});

test('objectUpdate() checks a readonly numeric key with no index signature beside it', () => {
	// `ReadonlyKeysOf` names `{readonly 1: …}` as the number `1`, and `'1' extends 1` is false, so the key set is compared by string form as well as by type, or the string spelling of that key would write straight through a `readonly` property.
	if (false) {
		// @ts-expect-error - `1` is readonly, in the numeric spelling.
		objectUpdate(makeReadonlyNumericKey(), {1: 'b'});

		// @ts-expect-error - `1` is the same key, spelled as a string.
		objectUpdate(makeReadonlyNumericKey(), {'1': 'b'});
	}

	// A writable key beside it is still writable in either spelling, and its value is still checked.
	if (false) {
		// @ts-expect-error - the value has to match the declared one.
		objectUpdate(makeReadonlyNumericKey(), {'2': 'x'});

		// @ts-expect-error - `3` is not a key of the target.
		objectUpdate(makeReadonlyNumericKey(), {'3': 'x'});
	}

	const writable = makeReadonlyNumericKey();
	objectUpdate(writable, {2: 5});
	objectUpdate(writable, {'2': 6});
	assert.deepEqual(writable, {1: 'a', 2: 6});

	// A key the target declares beside an index signature is checked against the declaration, while the spellings that are different runtime keys are answered by the signature.
	if (false) {
		// @ts-expect-error - `1` is declared as `'literal'`.
		objectUpdate(withIndexKey, {'1': 'index'});
	}

	assert.deepEqual(objectUpdate(makeWithIndexKey(), {'1.0': 'index'}), {1: 'literal', '1.0': 'index'});
	assert.deepEqual(objectUpdate(makeWithIndexKey(), {'01': 'index'}), {1: 'literal', '01': 'index'});
	assert.deepEqual(objectUpdate(makeWithIndexKey(), {1: 'literal'}), {1: 'literal'});
});

test('objectUpdate() checks a readonly key declared in the other spelling', () => {
	// A numeric-literal key has two spellings, and a target may declare either. The string spelling narrows only to the numeric one and the other way round, and the runtime key is the same either way, so the check has to answer for both.
	const numericTarget = {'1': 'one', a: 'x'} as {readonly '1': string; a: string};
	if (false) {
		// @ts-expect-error - `1` is the same key as `'1'`, which is readonly.
		numericTarget[1] = 'y';

		// @ts-expect-error - and the update agrees.
		objectUpdate(numericTarget, {1: 'y'});
	}

	const stringTarget = {1: 'one', a: 'x'} as {readonly 1: string; a: string};
	if (false) {
		// @ts-expect-error - `1` is the same key as `1`, which is readonly.
		stringTarget['1'] = 'y';

		// @ts-expect-error - and the update agrees.
		objectUpdate(stringTarget, {'1': 'y'});
	}

	// A writable key in either spelling is still writable.
	const writable = {'1': 'one', a: 'x'} as {'1': string; a: string};
	objectUpdate(writable, {1: 'y'});
	assert.equal(writable['1'], 'y');
});

test('objectUpdate() checks a readonly symbol key', () => {
	// A symbol key has no string form, so it is compared by type alone, and the two comparisons have to happen in that order: a symbol arm placed first would skip the type comparison entirely and let the update through.
	const key = Symbol('s');
	const target = {[key]: 1, a: 'x'} as {readonly [key]: number; a: string};

	if (false) {
		// @ts-expect-error - the symbol key is readonly, exactly as a direct assignment is.
		target[key] = 2;

		// @ts-expect-error - and the update agrees.
		objectUpdate(target, {[key]: 2});
	}

	// A writable symbol key beside it is still writable.
	const writable = {[key]: 1, a: 'x'} as {[key]: number; a: string};
	objectUpdate(writable, {[key]: 2});
	assert.equal(writable[key], 2);
});

test('objectUpdate() accepts a Pick or a Partial', () => {
	// An optional property cannot hold `undefined` unless it declares it, so a `Partial` over a required key cannot write one, and is accepted like a `Pick`. A source that declares `| undefined` for a required key is rejected, which an earlier test pins. The `@note` in the source says so.
	interface Account {
		readonly id: number;
		name: string;
		email?: string;
	}

	const user: Account = {id: 1, name: 'Sindre'};

	// An object literal is fine.
	objectUpdate(user, {name: 'Ada'});
	assert.equal(user.name, 'Ada');

	// A pre-typed `Pick` is fine, and so is one that came from a variable.
	const picked: Pick<Account, 'name' | 'email'> = {name: 'Grace'};
	objectUpdate(user, picked);
	assert.equal(user.name, 'Grace');

	// A `Partial` over a required key is fine too, because an optional property cannot hold `undefined` unless it declares it.
	const partial: Partial<Pick<Account, 'name'>> = {name: 'Alan'};
	objectUpdate(user, partial);
	assert.equal(user.name, 'Alan');

	// A `Partial` over only optional keys is fine.
	const optionalOnly: Partial<Pick<Account, 'email'>> = {email: 'a@b.c'};
	objectUpdate(user, optionalOnly);
	assert.equal(user.email, 'a@b.c');
});

test('objectUpdate() rejects undefined through a numeric key alias', () => {
	const target: {0: string} = {0: 'safe'};
	const patch: {'0'?: string | undefined} = {'0': undefined};

	if (false) {
		// @ts-expect-error - the string spelling still names the required numeric property.
		objectUpdate(target, patch);
	}

	assert.equal(target[0], 'safe');
});

test('objectUpdate() rejects a noncanonical numeric string on a number-indexed target', () => {
	const target: Record<number, string> = {1: 'one'};

	if (false) {
		// @ts-expect-error - '01' is a distinct key from numeric 1 and is not declared by the target.
		objectUpdate(target, {'01': 'separate'});
	}

	assert.equal(target[1], 'one');
});

test('objectUpdate() skips a __proto__ getter without reading it', () => {
	const target: Record<string, unknown> = {a: 1};
	const source = {
		get ['__proto__'](): unknown {
			throw new Error('the skipped getter must not run');
		},
		a: 2,
	};

	assert.equal(objectUpdate(target, source), target);
	assert.deepEqual(target, {a: 2});
	assert.equal(Object.getPrototypeOf(target), Object.prototype);
	assert.equal(Object.hasOwn(target, '__proto__'), false);
});

test('objectUpdate() rejects an optional undefined-only numeric alias for a required property', () => {
	const target: {0: string} = {0: 'safe'};
	const patch: {'0'?: undefined} = {'0': undefined};

	if (false) {
		// @ts-expect-error - `'0'` can only hold `undefined`, and the string spelling names the required numeric property `0`, which does not allow it.
		objectUpdate(target, patch);
	}

	objectUpdate(target, {'0': 'updated'});
	assert.deepEqual(target, {0: 'updated'});
});

test('objectUpdate() rejects an optional undefined-only unknown property', () => {
	const target = {value: 1};
	const patch: {typo?: undefined} = {typo: undefined};

	if (false) {
		// @ts-expect-error - An optional undefined value still writes an unknown key.
		objectUpdate(target, patch);
	}

	objectUpdate(target, {value: 2});
	assert.deepEqual(target, {value: 2});
	assert.equal(Object.hasOwn(target, 'typo'), false);
});
