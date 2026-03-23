import type {HasWidenedKey, ObjectType, ObjectWithFallbackProperty} from './internal-types.js';

type ObjectWithRequiredDefinedProperty<ObjectValue extends object, Key extends keyof ObjectValue> = ObjectValue & {
	[Property in keyof Pick<ObjectValue, Key>]-?: Exclude<ObjectValue[Property], undefined>;
};
type ObjectWithNarrowedDefinedProperty<ObjectValue extends object, Key extends PropertyKey> = ObjectValue extends unknown
	? Key extends keyof ObjectValue
		? ObjectWithRequiredDefinedProperty<ObjectValue, Key>
		: ObjectWithFallbackProperty<ObjectValue, Key>
	: never;

type ObjectWithDefinedProperty<Value, Key extends PropertyKey> = ObjectType<Value> extends infer ObjectValue
	? [ObjectValue] extends [object]
		? HasWidenedKey<Key> extends true
			// For widened keys we can only prove that the original object survives the filter.
			? ObjectValue
			: ObjectWithNarrowedDefinedProperty<ObjectValue & object, Key>
		: never
	: never;
type IsPropertyDefinedPredicate<Key extends PropertyKey> = <Value>(value: Value) => value is ObjectWithDefinedProperty<Value, Key>;

/**
Check whether a specific own property of a value is defined, meaning it is not `undefined`.

This is useful as a type guard in `.filter()`, where TypeScript does not automatically narrow property types. Only own (not inherited) data properties are considered.

@example
```
import {isPropertyDefined} from 'ts-extras';

type Item = {
	name: string;
	value: number | undefined;
};

const items: Item[] = [{name: 'a', value: 1}, {name: 'b', value: undefined}];

items.filter(isPropertyDefined('value'));
//=> [{name: 'a', value: 1}]
// Return type is `(Item & {value: number})[]`
```

@category Type guard
*/
export function isPropertyDefined<Key extends PropertyKey>(key: Key): IsPropertyDefinedPredicate<Key> {
	return (<Value>(
		value: Value,
	): value is ObjectWithDefinedProperty<Value, Key> => {
		if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
			return false;
		}

		const recordValue = value as Record<PropertyKey, unknown>;
		const propertyDescriptor = Object.getOwnPropertyDescriptor(recordValue, key);

		if (propertyDescriptor === undefined || !('value' in propertyDescriptor)) {
			return false;
		}

		return propertyDescriptor.value !== undefined;
	}) as IsPropertyDefinedPredicate<Key>;
}
