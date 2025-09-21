/**
A strongly-typed version of `Object.hasOwn()` that narrows the object type.

This function performs __object narrowing__ for own properties only - it adds the checked property to the object's type, allowing safe property access. Does not check the prototype chain.

Unlike `objectHasIn` (includes inherited) and `keyIn` (key narrowing), this narrows the _object_ type to include only own properties.

@example
```
import {objectHasOwn} from 'ts-extras';

const data: unknown = {foo: 1};

if (objectHasOwn(data, 'foo')) {
	// `data` is now: unknown & {foo: unknown}
	console.log(data.foo); // Safe access to own property
}

objectHasOwn({}, 'toString');
//=> false (inherited property, not own)
```

@category Improved builtin
@category Type guard
*/
export function objectHasOwn<ObjectType, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
): object is (ObjectType & Record<Key, unknown>) {
	return Object.hasOwn(object as Record<PropertyKey, unknown>, key);
}
