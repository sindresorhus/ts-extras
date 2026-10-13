import type {WithProvedProperty} from './internal-types.js';

// Shared property proofs exclude null and undefined from each object and key union member while preserving readonly declarations.
type WithPresentProperty<Value, Key extends PropertyKey> = WithProvedProperty<Value, Key, {}>;
// This must stay a single generic signature. An overloaded predicate passed directly to `.filter()` is inferred from its base signature, where `Value` is `unknown`, so `items.filter(isPropertyPresent('value'))` would stop narrowing. That is the main documented use, so do not add a boolean overload to protect edge-case false branches; document those instead.
type IsPropertyPresentPredicate<Key extends PropertyKey> = <Value>(value: Value) => value is WithPresentProperty<Value, Key>;

/**
Check whether a specific own property of a value is present (non-nullable), meaning it is neither `null` nor `undefined`.

This is useful as a type guard in `.filter()`, where TypeScript does not automatically narrow property types. Only own (not inherited) data properties are considered.

@note A union of shapes keeps members that do not declare the key. Their unknown property values are narrowed only by excluding `null` and `undefined`.

@note Narrowing assumes that a property the type declares with a matching value is an own data property. In an `if`/`else`, the `else` branch drops such members, so a value whose property comes from an accessor or the prototype can reach a branch typed `never`. With a union key, such as `'a' | 'b'`, the `else` branch drops every member that declares one of the keys with a matching value, so it can be `never` even when the checked key was missing. Filtering is not affected.

@note A value of a generic type narrows to a deferred type, where the property may not be readable. Narrow it to a concrete type first.

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

@note Readonly properties and index signatures remain readonly after narrowing.

@category Type guard
*/
export function isPropertyPresent<Key extends PropertyKey>(key: Key): IsPropertyPresentPredicate<Key> {
	return ((value: unknown) => {
		if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
			return false;
		}

		const recordValue = value as Record<PropertyKey, unknown>;
		// A revoked proxy, or one whose descriptor trap throws, is a value whose own keys cannot be read, and that is the same answer as one that owns none. `objectHasOwn()`, `objectHasIn()` and `keyIn()` all guard this, and `assertError()` handles the same hazard.
		let propertyDescriptor: PropertyDescriptor | undefined;
		try {
			propertyDescriptor = Object.getOwnPropertyDescriptor(recordValue, key);
		} catch {
			return false;
		}

		if (propertyDescriptor === undefined || !('value' in propertyDescriptor)) {
			return false;
		}

		const propertyValue: unknown = propertyDescriptor.value;

		return propertyValue !== null
			&& propertyValue !== undefined;
	}) as IsPropertyPresentPredicate<Key>;
}
