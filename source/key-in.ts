import type {IsLiteral, OmitIndexSignature} from 'type-fest';
import type {HasWidenedKey, KeysOfMembers} from './internal-types.js';

// Names the guard rejects outright, so the runtime can never report them as present.
type BlockedKeys = '__proto__' | 'constructor';

// The runtime uses the `in` operator, so it reports `true` for every name a prototype contributes, not just the object's own keys. `keyof ObjectType` cannot see those, so they must be added back or the narrowing would deny a key the runtime accepts. `keyof Object` is the `Object` interface rather than the `object` primitive, whose `keyof` is `never`, and it covers most of `Object.prototype` but not the `__proto__` family. Members inherited from a user class prototype are an unsupported boundary.
type ReachableInheritedKeys =
	| Exclude<keyof Object, BlockedKeys> // eslint-disable-line @typescript-eslint/no-wrapper-object-types -- The `Object` interface, not the `object` primitive.
	| '__defineGetter__' | '__defineSetter__' | '__lookupGetter__' | '__lookupSetter__';

// A value typed `object` declares no keys, so any key may be there.
type KnownKeys<ObjectType> = [KeysOfMembers<ObjectType>] extends [never] ? PropertyKey : KeysOfMembers<ObjectType>;

// A numeric-literal key and its string form are the same runtime key, so the two are compared by their string form. A symbol has no string form, so it is compared by type alone.
type IsKnownKey<Key, Known> = Key extends Known
	? true
	: Key extends string | number
		? `${Key}` extends `${Extract<Known, string | number>}` ? true : false
		: false;

type ProvableKeys<ObjectType, Key extends PropertyKey> = Exclude<
	(Key extends unknown ? IsKnownKey<Key, KnownKeys<ObjectType>> extends true ? Key : never : never) | Extract<Key, ReachableInheritedKeys>,
	BlockedKeys
>;

type NarrowedKey<ObjectType, Key extends PropertyKey> = HasWidenedKey<Key> extends true
	? Key
	: IsLiteral<Key> extends true
		? ProvableKeys<ObjectType, Key>
		: Key;

// A predicate removes matching keys from the false branch, so every matching literal must be declared in every object member. Widened keys, index signatures, and keys only some members declare would make the false branch `never` or drop keys that are plainly possible, so they return a boolean.
// Boundary: a declared optional key does narrow, because narrowing the true branch is the point of `keyIn()` and v1.3.0 did it. The cost is that the false branch also drops an optional key that is absent at runtime. A single type predicate cannot narrow only one branch, so do not gate optional keys again to fix that; document it.
type NarrowableKey<ObjectType, Key extends PropertyKey> = [HasWidenedKey<Key>] extends [false]
	? [IsKnownKey<NarrowedKey<ObjectType, Key>, keyof OmitIndexSignature<ObjectType>>] extends [true]
		? Key
		: never
	: never;

/**
Check if a key is in an object and narrow the key to the object's keys.

This function performs __key narrowing__ - it narrows the key variable to only keys that actually exist in the object. Uses the `in` operator to check the entire prototype chain.

For a union of literal keys, narrowing is available when every matching key is declared in every member of the object's type. When `keyIn` returns `true`, the key narrows to those matching keys, excluding `__proto__` and `constructor`, which the runtime always rejects. When it returns `false`, the key narrows to the remaining members, which is why the example below leaves only `'baz'`.

Unlike `objectHasIn` and `objectHasOwn` (both do object narrowing), this narrows the _key_ type, making it useful for validating union types of possible keys.

@example
```
import {keyIn} from 'ts-extras';

const object = {foo: 1, bar: 2};
const key = 'foo' as 'foo' | 'bar' | 'baz';

if (keyIn(object, key)) {
	// `key` is now: 'foo' | 'bar' (narrowed from union)
	console.log(object[key]); // Safe access
} else {
	// `key` is now: 'baz' (the remaining members)
}

// Works with symbols
const symbol = Symbol.for('myKey');
const objectWithSymbol = {[symbol]: 'value'};
if (keyIn(objectWithSymbol, symbol)) {
	// symbol is narrowed to existing symbol keys
}
```

@note This uses the `in` operator and checks the prototype chain, but blocks `__proto__` and `constructor` for security.

@note Primitives are boxed, like with the `in` operator on `Object(value)`, so `'length'` is found on a string. `null` and `undefined` return `false`.

@note If the object's type has none of the key's members, the key narrows to `never` in the true branch.

@note An optional key narrows, but the false branch then also excludes it, even though the key may be absent at runtime.

@note Index signatures, keys present in only some union members, widened keys, and values typed `object` return a boolean without narrowing either branch. The same applies to inherited names not declared in the object's type, since an object may have no prototype.

@note Key narrowing assumes that queried properties present at runtime appear in `keyof` the object's type. Extra own or custom-prototype properties hidden by a narrower type are unsupported for narrowing; the runtime check still finds them.

@category Type guard
*/
export function keyIn<ObjectType extends object, Key extends PropertyKey>(
	object: ObjectType,
	key: Key & NarrowableKey<ObjectType, Key>,
	// The presence guarantee keeps uncertain and still-generic keys on the boolean overload. Concrete unions of guaranteed keys narrow to their remaining members in the false branch.
): key is NarrowedKey<ObjectType, Key> & NarrowableKey<ObjectType, Key>;
export function keyIn<ObjectType extends object, Key extends PropertyKey>(object: ObjectType, key: Key): boolean;
export function keyIn(object: object, key: PropertyKey): boolean {
	// Guard against prototype pollution
	// `null` and `undefined` have no wrapper object, so boxing them would hand `in` an empty object that still inherits from `Object.prototype`, and the guard would report every prototype name as present on a value that owns nothing. They answer `false`, which is what `objectHasOwn()` says for them too.
	if (key === '__proto__' || key === 'constructor' || object === null || object === undefined) {
		return false;
	}

	// `ObjectType extends object`, so a primitive only reaches the guard through an `any` or a cast, and the `in` operator throws for one. Boxing it matches how `in` resolves against the matching wrapper object (`'length' in Object('abc')` is `true`) and what the two sibling guards do.
	try {
		return Reflect.has(Object(object) as object, key); // eslint-disable-line unicorn/new-for-builtins -- `Object()` used as a converter, not a constructor.
	} catch {
		// `in` reads the prototype chain, so a revoked proxy, or one whose `has` trap throws, is a value whose keys cannot be read, and that is the same answer as one that has none.
		return false;
	}
}
