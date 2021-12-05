const has = Object.prototype.hasOwnProperty;

/**
Shortcut for `Object.prototype.hasOwnProperty.call(object, property)`.

@example
```
import objectHasOwn from 'ts-extras';

objectHasOwn({}, 'hello');
//=> false

objectHasOwn([1, 2, 3], 0);
//=> true
```
*/
export function objectHasOwn<ObjectType, Key extends PropertyKey>(
	object: ObjectType,
	key: Key,
): object is (ObjectType & Record<Key, unknown>) {
	return has.call(object, key);
}

