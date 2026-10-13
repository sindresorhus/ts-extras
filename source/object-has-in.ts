import type {BlocksNarrowing, ProvedKeys} from './internal-types.js';

// The runtime answers `false` for these two whatever the value is, so a blocked-only key makes the true branch impossible and leaves the false branch unchanged. Mixed keys omit these names from the properties they prove, matching the runtime rejection in `keyIn()`.
type BlockedKeys = '__proto__' | 'constructor';

type PresenceProof<ObjectType, Key extends PropertyKey> = [Exclude<Key, BlockedKeys>] extends [never] ? never : ObjectType & ProvedKeys<ObjectType, Exclude<Key, BlockedKeys>>;

// `unknown` when some member blocks narrowing (see `BlocksNarrowing`), which lets the boolean overload match. Otherwise `never`, so the call falls through to the narrowing overload. A generic input leaves this deferred, so it narrows too.
type BooleanOnly<ObjectType, Key extends PropertyKey> = true extends (ObjectType extends unknown ? BlocksNarrowing<ObjectType, Key, PresenceProof<ObjectType, Key>> : never)
	? unknown
	: never;

/**
Check if an object has a property (including inherited) and narrow the object type.

This function performs __object narrowing__ - it adds the checked property to the object's type, allowing safe property access. Uses the `in` operator to check the entire prototype chain.

Unlike `objectHasOwn` (own properties only) and `keyIn` (key narrowing), this narrows the _object_ type to include inherited properties.

@example
```
import {objectHasIn} from 'ts-extras';

const data: unknown = {foo: 1};

if (objectHasIn(data, 'foo')) {
	// `data` is now: Record<'foo', unknown>
	console.log(data.foo); // Safe access
}

// Also checks prototype chain
if (objectHasIn(data, 'toString')) {
	// `data` is now: Record<'toString', unknown>
	console.log(data.toString); // Safe access to inherited method
}
```

@note This uses the `in` operator and checks the entire prototype chain, but blocks `__proto__` and `constructor` for security.

@note Since `__proto__` and `constructor` are blocked, passing either or a union of only these names narrows the true branch to `never` and leaves the false branch unchanged.

@note A union key adds its members as optional properties to a value such as `unknown`. An object type, including `object`, already satisfies those optional properties, so it gets a boolean without narrowing. Blocked keys are left out, so `'a' | 'constructor'` gives a required `a`.

@note Primitives are boxed, like with the `in` operator on `Object(value)`, so `'length'` is found on a string. `null` and `undefined` return `false`.

@note A widened key, such as `string`, adds an index signature with `unknown` values, so `data[field]` is `unknown`. This narrows `unknown`, `object`, interfaces, and type literals. A type with an index signature, such as a `Record`, already has one, so it gets a boolean without narrowing. A generic input always narrows, so with an index-signature constraint its false branch can be `never`.

@note Returns a boolean without narrowing when a member of the input type already satisfies the property proof without declaring the key as a required property, which happens for a widened key on a type with an index signature, such as a `Record`, or a union key on an object type, so both branches remain usable. A member that declares the key as required narrows like the `in` operator does, so `{a: number} | {b: string}` and `{a: number} | null` narrow.

@category Type guard
*/
// The gated boolean overload must come first. In the other order a generic input, whose gate stays deferred, could not match the narrowing overload and fell through to the boolean one.
export function objectHasIn<ObjectType, Key extends PropertyKey>(object: ObjectType & BooleanOnly<ObjectType, Key>, key: Key): boolean;
export function objectHasIn<ObjectType, Key extends PropertyKey>(object: ObjectType, key: Key): object is PresenceProof<ObjectType, Key>;
export function objectHasIn(object: unknown, key: PropertyKey): boolean {
	// Guard against prototype pollution
	// `null` and `undefined` have no wrapper object, so boxing them would hand `in` an empty object that still inherits from `Object.prototype`, and the guard would report every prototype name as present on a value that owns nothing. Reading one then throws, so the narrowing would be the very thing that breaks. They answer `false`, which is what `objectHasOwn()` says for them too.
	if (key === '__proto__' || key === 'constructor' || object === null || object === undefined) {
		return false;
	}

	// `ObjectType` is unconstrained, so the value is routinely a primitive at runtime. The `in` operator throws for primitives, while boxing matches how `in` resolves against the matching wrapper object (`'length' in Object('abc')` is `true`).
	try {
		return Reflect.has(Object(object) as object, key); // eslint-disable-line unicorn/new-for-builtins -- `Object()` used as a converter, not a constructor.
	} catch {
		// A revoked proxy, or one whose `has` trap throws, is a value whose keys cannot be read, and that is the same answer as one that has none. Mocking libraries and resource wrappers revoke on teardown, and `assertError()` handles the same hazard the same way.
		return false;
	}
}
