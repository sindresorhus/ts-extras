/**
Check if an object has a property (including inherited) and narrow the object type.

This function performs __object narrowing__ - it adds the checked property to the object's type, allowing safe property access. Uses the `in` operator to check the entire prototype chain.

Unlike `objectHasOwn` (own properties only) and `keyIn` (key narrowing), this narrows the _object_ type to include inherited properties.

@example
```
import {objectHasIn} from 'ts-extras';

const data: unknown = {foo: 1};

if (objectHasIn(data, 'foo')) {
	// `data` is now: unknown & {foo: unknown}
	console.log(data.foo); // Safe access
}

// Also checks prototype chain
if (objectHasIn(data, 'toString')) {
	// `data` is now: unknown & {toString: unknown}
	console.log(data.toString); // Safe access to inherited method
}
```

@note This uses the `in` operator and checks the entire prototype chain, but blocks `__proto__` and `constructor` for security.

@category Type guard
*/
export function objectHasIn<ObjectType, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
): object is (ObjectType & Record<Key, unknown>) {
	// Guard against prototype pollution
	if (key === '__proto__' || key === 'constructor') {
		return false;
	}

	return key in (object as Record<PropertyKey, unknown>);
}
