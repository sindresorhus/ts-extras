import type {BlocksNarrowing, ProvedKeys} from './internal-types.js';

type PresenceProof<ObjectType, Key extends PropertyKey> = ObjectType & ProvedKeys<ObjectType, Key>;

// `unknown` when some member blocks narrowing (see `BlocksNarrowing`), which lets the boolean overload match. Otherwise `never`, so the call falls through to the narrowing overload. A generic input leaves this deferred, so it narrows too.
type BooleanOnly<ObjectType, Key extends PropertyKey> = true extends (ObjectType extends unknown ? BlocksNarrowing<ObjectType, Key, PresenceProof<ObjectType, Key>> : never)
	? unknown
	: never;

/**
A strongly-typed version of `Object.hasOwn()` that narrows the object type.

This function performs __object narrowing__ for own properties only - it adds the checked property to the object's type, allowing safe property access. Does not check the prototype chain.

Unlike `objectHasIn` (includes inherited) and `keyIn` (key narrowing), this narrows the _object_ type to include only own properties.

@example
```
import {objectHasOwn} from 'ts-extras';

const data: unknown = {foo: 1};

if (objectHasOwn(data, 'foo')) {
	// `data` is now: Record<'foo', unknown>
	console.log(data.foo); // Safe access to own property
}

objectHasOwn({}, 'toString');
//=> false (inherited property, not own)
```

@note A widened key, such as `string`, adds an index signature with `unknown` values, so `data[field]` is `unknown`. This narrows `unknown`, `object`, interfaces, and type literals. A type with an index signature, such as a `Record`, already has one, so it gets a boolean without narrowing. A generic input always narrows, so with an index-signature constraint its false branch can be `never`.

@note Unlike `objectHasIn()`, `__proto__` and `constructor` are not blocked, since only own properties are checked.

@note Returns a boolean without narrowing when a member of the input type already satisfies the property proof without declaring the key as a required property, which happens for a widened key on a type with an index signature, such as a `Record`, or a union key on an object type, so both branches remain usable. A member that declares the key as required narrows like the `in` operator does, so `{a: number} | {b: string}` and `{a: number} | null` narrow. This assumes the declared property is an own property: if it comes from the prototype, such as a class method, the `else` branch is wrong for that value.

@category Improved builtin
@category Type guard
*/
// The gated boolean overload must come first. In the other order a generic input, whose gate stays deferred, could not match the narrowing overload and fell through to the boolean one.
export function objectHasOwn<ObjectType, Key extends PropertyKey>(object: ObjectType & BooleanOnly<ObjectType, Key>, key: Key): boolean;
export function objectHasOwn<ObjectType, Key extends PropertyKey>(object: ObjectType, key: Key): object is PresenceProof<ObjectType, Key>;
export function objectHasOwn(object: unknown, key: PropertyKey): boolean {
	// `Object.hasOwn()` throws for `null` and `undefined`, but `ObjectType` is unconstrained and the documented use is on an `unknown` value. Boxing yields an empty object, which owns nothing, so the guard answers `false` instead of throwing. `objectHasIn()` answers `false` for the same two as well, which it has to, since boxing them there would let `in` report every name `Object.prototype` contributes.
	try {
		return Object.hasOwn(Object(object) as Record<PropertyKey, unknown>, key); // eslint-disable-line unicorn/new-for-builtins -- `Object()` used as a converter, not a constructor.
	} catch {
		// A revoked proxy, or one whose descriptor trap throws, is a value whose own keys cannot be read, and that is the same answer as one that owns none. Mocking libraries and resource wrappers revoke on teardown, and `assertError()` handles the same hazard.
		return false;
	}
}
