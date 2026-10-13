import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {expectTypeOf} from 'expect-type';
import {assertError, assertNever} from '../source/index.js';

test('assertError()', () => {
	assert.doesNotThrow(() => {
		assertError(new Error('x'));
	});

	assert.throws(() => {
		assertError('x');
	}, TypeError);

	assert.throws(() => {
		assertError('x', 'Custom message');
	}, {message: 'Custom message'});
});

test('assertError() always throws a TypeError, even for values that resist inspection', () => {
	// `describeValue()` is hardened against values that throw while being inspected, and the brand check that runs first must be too, so a hostile `Symbol.toStringTag` still gives the documented `TypeError` and not the trap's own error.
	const hostileTag = new Proxy({}, {
		get(target, property, receiver) {
			if (property === Symbol.toStringTag) {
				throw new RangeError('boom');
			}

			return Reflect.get(target, property, receiver) as unknown;
		},
	});

	assert.throws(() => {
		assertError(hostileTag);
	}, {name: 'TypeError', message: /Expected an Error/v});

	// A revoked proxy is not purely adversarial: mocking libraries and resource wrappers revoke on teardown, and the internal V8 error leaks through here.
	const {proxy, revoke} = Proxy.revocable({}, {});
	revoke();

	assert.throws(() => {
		assertError(proxy);
	}, {name: 'TypeError', message: /Expected an Error/v});
});

test('assertError() describes values that JSON.stringify() cannot serialize', () => {
	// `JSON.stringify()` returns `undefined` rather than throwing for a symbol or a function, so the message must not describe those values as `undefined`.
	assert.throws(() => {
		assertError(Symbol('x'));
	}, {message: 'Expected an Error, got [object Symbol] (symbol) → Symbol(x)'});

	const namedFunction = () => {};
	// The exact source text depends on how the file is transpiled, so only check that the function is described as a function rather than reported as `undefined`.
	assert.throws(() => {
		assertError(namedFunction);
	}, (error: unknown) => {
		assert.ok(error instanceof TypeError);
		assert.match(error.message, /Expected an Error, got \[object Function\] \(function\) → /v);
		assert.doesNotMatch(error.message, /→ undefined$/v);
		return true;
	});

	// `undefined` itself reads as `undefined`, because it is stringified.
	assert.throws(() => {
		assertError(undefined);
	}, {message: 'Expected an Error, got [object Undefined] (undefined) → undefined'});

	// Serializable values keep the richer JSON form.
	assert.throws(() => {
		assertError({a: 1});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":1}'});

	// Regression: a string is JSON-quoted, as in v1.3.0, so `'1'` does not read as the number `1`.
	assert.throws(() => {
		assertError('x');
	}, {message: 'Expected an Error, got [object String] (string) → "x"'});

	assert.throws(() => {
		assertError('1');
	}, {message: 'Expected an Error, got [object String] (string) → "1"'});
});

test('assertError() rejects a forged Error brand', () => {
	// `Object.prototype.toString` honours `Symbol.toStringTag`, so the brand on its own is not proof. Accepting one narrows a plain object to `Error`, and the documented use case then reads `undefined` off `error.message`, which the compiler believes is a string.
	const forged = {[Symbol.toStringTag]: 'Error'};
	assert.throws(() => {
		assertError(forged);
	}, TypeError);

	// Genuine errors still pass, including ones from another realm and tagged subclasses.
	assert.doesNotThrow(() => {
		assertError(new Error('x'));
	});
	assert.doesNotThrow(() => {
		assertError(runInNewContext('new Error("cross-realm")'));
	});
	assert.doesNotThrow(() => {
		assertError(Object.assign(new Error('x'), {[Symbol.toStringTag]: 'MyError'}));
	});
});

test('assertError() accepts an error-shaped object made from Error.prototype', () => {
	// `Object.create(Error.prototype)` passes `instanceof`, and telling it apart from a real error would need a runtime-specific API, so it is accepted and documented as such.
	const shaped = Object.create(Error.prototype) as Error;

	assert.equal(shaped instanceof Error, true);
	assert.doesNotThrow(() => {
		assertError(shaped);
	});
});

test('assertError() narrows the value to Error', () => {
	// The `asserts value is Error` signature is the only reason to reach for this function, so this test fails if the assertion signature is removed.
	const caught: unknown = new TypeError('boom');
	assertError(caught);
	expectTypeOf(caught).toEqualTypeOf<Error>();
	assert.equal(caught.message, 'boom');
});

test('assertNever() returning never makes a switch exhaustive', () => {
	// The `never` return is the whole point: it is what lets a `default` branch satisfy `noImplicitReturns`. Changing it to `void` leaves this function with a path that falls off the end.
	type Status = 'idle' | 'done';

	const render = (status: Status): string => {
		switch (status) {
			case 'idle': {
				return 'Idle';
			}

			case 'done': {
				return 'Done';
			}

			default: {
				return assertNever(status);
			}
		}
	};

	assert.equal(render('idle'), 'Idle');
	assert.equal(render('done'), 'Done');
});

test('assertError() does not report a non-finite number as null', () => {
	// `JSON.stringify()` maps `NaN` and the infinities to `null`, so the message must not use it for them, or it would name a value the caller never passed.
	assert.throws(() => {
		assertError(NaN);
	}, {message: 'Expected an Error, got [object Number] (number) → NaN'});

	assert.throws(() => {
		assertError(Infinity);
	}, {message: 'Expected an Error, got [object Number] (number) → Infinity'});

	assert.throws(() => {
		assertError(-Infinity);
	}, {message: 'Expected an Error, got [object Number] (number) → -Infinity'});

	// A finite number still serializes as JSON.
	assert.throws(() => {
		assertError(42);
	}, {message: 'Expected an Error, got [object Number] (number) → 42'});
});

test('assertError() says a forged brand is forged', () => {
	// The brand is what the guard distrusts, so the message marks it as forged rather than printing it as though it described the value, which would read as if the value were an error.
	assert.throws(() => {
		assertError({[Symbol.toStringTag]: 'Error'});
	}, {message: 'Expected an Error, got [object Error] (object) (a forged Error brand) → {}'});

	// A value that is not branded as an error gets no hint.
	assert.throws(() => {
		assertError({a: 1});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":1}'});
});

test('assertError() does not report a nested non-finite number as null', () => {
	// A non-finite number one level down is described as itself too, since `JSON.stringify()` maps `NaN` and the infinities to `null` at every depth.
	assert.throws(() => {
		assertError({a: NaN});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":"NaN"}'});

	assert.throws(() => {
		assertError([Infinity]);
	}, {message: 'Expected an Error, got [object Array] (object) → ["Infinity"]'});

	assert.throws(() => {
		assertError({a: {b: -Infinity}});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":{"b":"-Infinity"}}'});

	// A finite number is still serialized as a JSON number, not as a string.
	assert.throws(() => {
		assertError({a: 42});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":42}'});
});

test('assertError() describes a value holding a bigint', () => {
	// `JSON.stringify()` throws on a bigint, and the `String()` fallback drops an array's brackets and an object's contents, so a bigint is written as a string and the value is still serialized as JSON. An array of one bigint must not read as the bare number `1`.
	assert.throws(() => {
		assertError([1n]);
	}, {message: 'Expected an Error, got [object Array] (object) → ["1"]'});

	assert.throws(() => {
		assertError({a: 1n});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":"1"}'});

	// A circular structure still falls through rather than throwing.
	const circular: Record<string, unknown> = {};
	circular['self'] = circular;
	assert.throws(() => {
		assertError(circular);
	}, {message: 'Expected an Error, got [object Object] (object) → [object Object]'});
});

test('assertError() accepts an error from another realm', () => {
	// `instanceof` alone misses a cross-realm error, which is what a value crossing a worker or a `vm` context is. The brand is what makes it recognisable, so it is checked too.
	const foreign = runInNewContext('new Error("foreign")') as unknown;

	assert.ok(!(foreign instanceof Error));
	assert.doesNotThrow(() => {
		assertError(foreign);
	});

	assert.doesNotThrow(() => {
		assertError(runInNewContext('new TypeError("foreign")') as unknown);
	});

	// A value that only claims the brand is still rejected, in a foreign realm too.
	assert.throws(() => {
		assertError(runInNewContext('({[Symbol.toStringTag]: "Error"})') as unknown);
	}, {message: /a forged Error brand/v});

	// Boundary: a real foreign error that also sets the tag looks the same as a forged one, so it is rejected too. `Error.isError()` could tell them apart, but a common polyfill of it trusts the tag, which would accept forged brands.
	assert.throws(() => {
		assertError(runInNewContext('Object.defineProperty(new Error("foreign"), Symbol.toStringTag, {value: "Error"})') as unknown);
	}, {message: /a forged Error brand/v});
});

test('assertError() rejects the values that only look like an error', () => {
	for (const value of [undefined, null, 'Error', 0, true, {}, [], Object.prototype, Error.prototype]) {
		assert.throws(() => {
			assertError(value);
		}, TypeError);
	}
});

test('assertError() follows a toJSON method like JSON.stringify()', () => {
	// Boundary: a `toJSON()` method describes its value, at any depth, as it does for `JSON.stringify()`. Skipping it only at the top level lost the whole value, such as `{toJSON() {…}, a: 1}`, without preventing anything, since a nested one still ran.
	assert.throws(() => {
		assertError({toJSON: () => 'custom'});
	}, {message: 'Expected an Error, got [object Object] (object) → "custom"'});

	assert.throws(() => {
		assertError({a: {toJSON: () => 42}});
	}, {message: 'Expected an Error, got [object Object] (object) → {"a":42}'});

	// A `toJSON` that throws falls back to the value's own text.
	assert.throws(() => {
		assertError({
			toJSON() {
				throw new Error('nope');
			},
		});
	}, {message: 'Expected an Error, got [object Object] (object) → [object Object]'});

	// A `Date` reads as its ISO form.
	assert.throws(() => {
		assertError(new Date(Date.UTC(2000, 5, 15, 12)));
	}, {message: 'Expected an Error, got [object Date] (object) → "2000-06-15T12:00:00.000Z"'});
});

test('assertError() describes a self-referential array', () => {
	// `String()` succeeds on a circular array: `Array#join` detects the cycle and returns an empty string, which is a successful stringification. An empty description names nothing, so the brand is better than nothing. A circular object throws instead, which another test covers.
	const circular: unknown[] = [];
	circular.push(circular);

	assert.throws(() => {
		assertError(circular);
	}, {message: 'Expected an Error, got [object Array] (object) → [object Array]'});

	// Regression: the empty string is quoted, so the description is not empty.
	assert.throws(() => {
		assertError('');
	}, {message: 'Expected an Error, got [object String] (string) → ""'});
});
