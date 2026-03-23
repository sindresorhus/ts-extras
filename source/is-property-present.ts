import type {HasWidenedKey, ObjectType, ObjectWithFallbackProperty} from './internal-types.js';

type ObjectWithRequiredPresentProperty<ObjectValue extends object, Key extends keyof ObjectValue> = ObjectValue & {
	[Property in keyof Pick<ObjectValue, Key>]-?: NonNullable<ObjectValue[Property]>;
};
type ObjectWithNarrowedPresentProperty<ObjectValue extends object, Key extends PropertyKey> = ObjectValue extends unknown
	? Key extends keyof ObjectValue
		? ObjectWithRequiredPresentProperty<ObjectValue, Key>
		: ObjectWithFallbackProperty<ObjectValue, Key>
	: never;

type ObjectWithPresentProperty<Value, Key extends PropertyKey> = ObjectType<Value> extends infer ObjectValue
	? [ObjectValue] extends [object]
		? HasWidenedKey<Key> extends true
			// For widened keys we can only prove that the original object survives the filter.
			? ObjectValue
			: ObjectWithNarrowedPresentProperty<ObjectValue & object, Key>
		: never
	: never;
type IsPropertyPresentPredicate<Key extends PropertyKey> = <Value>(value: Value) => value is ObjectWithPresentProperty<Value, Key>;

/**
Check whether a specific own property of a value is present (non-nullable), meaning it is neither `null` nor `undefined`.

This is useful as a type guard in `.filter()`, where TypeScript does not automatically narrow property types. Only own (not inherited) data properties are considered.

@example
```
import {isPropertyPresent} from 'ts-extras';

type Item = {
	name: string;
	value: number | null | undefined;
};

const items: Item[] = [{name: 'a', value: 1}, {name: 'b', value: null}, {name: 'c', value: undefined}];

items.filter(isPropertyPresent('value'));
//=> [{name: 'a', value: 1}]
// Return type is `(Item & {value: number})[]`
```

@category Type guard
*/
export function isPropertyPresent<Key extends PropertyKey>(key: Key): IsPropertyPresentPredicate<Key> {
	return (<Value>(
		value: Value,
	): value is ObjectWithPresentProperty<Value, Key> => {
		if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
			return false;
		}

		const recordValue = value as Record<PropertyKey, unknown>;
		const propertyDescriptor = Object.getOwnPropertyDescriptor(recordValue, key);

		if (propertyDescriptor === undefined || !('value' in propertyDescriptor)) {
			return false;
		}

		const propertyValue = propertyDescriptor.value;

		return propertyValue !== null
			&& propertyValue !== undefined;
	}) as IsPropertyPresentPredicate<Key>;
}
