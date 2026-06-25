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
	assert.deepEqual(result, {name: 'Sindre', age: 42});
	expectTypeOf(result).toEqualTypeOf<User>();

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

	// Unlike a bare `Partial<User>` constraint, this is caught even though the
	// source is a variable rather than an object literal.
	const patch = {nickname: 'sindre'};

	// @ts-expect-error - 'nickname' does not exist on the target
	objectUpdate(user, patch);
});

test('objectUpdate() rejects unsafe partial variables for required keys', () => {
	const user: User = {name: 'Sindre', age: 41};
	const patch: Partial<User> = {age: undefined};

	// @ts-expect-error - `Partial<User>` may set required keys to `undefined` when `exactOptionalPropertyTypes` is off
	objectUpdate(user, patch);
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
	const config: {timeout?: number; retries: number} = {retries: 3};

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
	const shape: Shape = Math.random() > 0.5 ? {kind: 'a', value: 1, x: 1} : {kind: 'b', value: 1, y: 1};

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
