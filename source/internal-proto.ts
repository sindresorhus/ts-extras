/*
`Object.assign()` writes with `[[Set]]`, so an own `__proto__` on a source invokes the inherited setter and swaps the target's prototype instead of writing a property. That is a prototype-pollution vector rather than a merge, so the name is skipped the way `keyIn()` and `objectHasIn()` refuse it outright. `constructor` is not skipped, since assigning it really does write an own property.

Copy each enumerable property immediately, so getters observe earlier target writes and a later failure preserves those writes. Skip `__proto__` before reading its value, including when it is an accessor.
*/
export function assignWithoutOwnProto<Target extends object>(target: Target, source: unknown): Target {
	const result = Object.assign(target) as Target;
	const sourceObject = Object(source) as Record<PropertyKey, unknown>; // eslint-disable-line unicorn/new-for-builtins -- Box primitives as Object.assign() does.

	for (const key of Reflect.ownKeys(sourceObject)) {
		if (key === '__proto__' || !Object.getOwnPropertyDescriptor(sourceObject, key)?.enumerable) {
			continue;
		}

		// A plain write has the same `[[Set]]` semantics as `Object.assign()` (this module is strict mode, so a failed write still throws) without allocating a wrapper object per key.
		(result as Record<PropertyKey, unknown>)[key] = sourceObject[key];
	}

	return result;
}
