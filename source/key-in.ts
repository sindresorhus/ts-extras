/**
Check if a key exists in an object and narrow the key type.

This function performs __key narrowing__ - it narrows the key variable to only keys that actually exist in the object. Uses the `in` operator to check the entire prototype chain.

When `keyIn` returns `true`, the key is narrowed to keys that exist in the object.
When it returns `false`, the key type remains unchanged.

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
	// `key` remains: 'foo' | 'bar' | 'baz' (unchanged)
}

// Works with symbols
const symbol = Symbol.for('myKey');
const objectWithSymbol = {[symbol]: 'value'};
if (keyIn(objectWithSymbol, symbol)) {
	// symbol is narrowed to existing symbol keys
}
```

@note This uses the `in` operator and checks the prototype chain, but blocks `__proto__` and `constructor` for security.

@category Type guard
*/
export function keyIn<ObjectType extends Record<PropertyKey, unknown>, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
	// The `& {}` prevents TypeScript from narrowing the type in the `else` branch,
	// since a key not being in the object doesn't mean it isn't that type of key.
	// eslint-disable-next-line @typescript-eslint/ban-types
): key is Extract<Key, Exclude<keyof ObjectType, '__proto__' | 'constructor'>> & {} {
	// Guard against prototype pollution
	if (key === '__proto__' || key === 'constructor') {
		return false;
	}

	return key in (object as Record<PropertyKey, unknown>);
}
