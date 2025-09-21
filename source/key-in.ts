/**
Check if a key is in an object and narrow the key to the object's keys.

This narrows the key variable to only the keys that actually exist in the object, using TypeScript's `Extract` utility type. Unlike `objectHasOwn`, this uses the `in` operator and checks the entire prototype chain.

@example
```
import {keyIn} from 'ts-extras';

const object = {foo: 1, bar: 2};
const key = 'foo' as 'foo' | 'bar' | 'baz';

if (keyIn(object, key)) {
	key;
	//=> 'foo' | 'bar'
}

// Works with symbols
const symbol = Symbol.for('myKey');
const objectWithSymbol = {[symbol]: 'value'};
if (keyIn(objectWithSymbol, symbol)) {
	// symbol is narrowed to the symbol keys
}
```

@note This uses the `in` operator for all keys except `__proto__` and `constructor`, which are blocked for security. For own properties only, use `objectHasOwn`.

@category Type guard
*/
export function keyIn<ObjectType extends Record<PropertyKey, unknown>, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
): key is Extract<Key, Exclude<keyof ObjectType, '__proto__' | 'constructor'>> {
	// Guard against prototype pollution
	if (key === '__proto__' || key === 'constructor') {
		return false as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
	}

	return key in (object as any);
}
