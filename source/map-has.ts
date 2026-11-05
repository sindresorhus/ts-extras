/**
A strongly-typed version of `Map#has()` that properly acts as a type guard.

When it returns `true`, the key is narrowed to the map's key type. When it returns `false`, an `unknown` key stays `unknown`, but a union key loses the members the key type covers, which is unsound if the map does not hold all of them.

@example
```
import {mapHas} from 'ts-extras';

const labels = new Map([['a', 'Alpha'], ['b', 'Beta']] as const);
const key: unknown = 'a';

if (mapHas(labels, key)) {
	// We now know that the key is of type `'a' | 'b'`.
	labels.get(key);
} else {
	// The key remains `unknown`.
}
```

@note This narrows the key, not the map, so `map.get(key)` still includes `undefined`.

@category Improved builtin
@category Type guard
*/
// A key the key type already covers needs no separate type parameter: the map alone decides it. This overload returns `boolean` because a missing key can still have the map's key type, so the false branch must not exclude that type.
export function mapHas<Key>(
	map: ReadonlyMap<Key, unknown>,
	// `NoInfer` keeps the key type decided by the map alone. Inferring it from the key as well would widen it to whatever the key is, and an `unknown` key would then erase the guard.
	key: NoInfer<Key>,
): boolean;

// A key not being in the map says nothing about the key's own type, so the `else` branch is left alone whenever the key is wider than the key type, which is the `unknown` case this guard is written for. A key typed as a union the map also holds is narrowed away there.
export function mapHas<Key extends SuperType, SuperType = unknown>(
	map: ReadonlyMap<Key, unknown>,
	key: SuperType,
): key is Key;

export function mapHas(map: ReadonlyMap<unknown, unknown>, key: unknown) {
	return map.has(key);
}
