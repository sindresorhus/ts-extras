import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {assertNever} from '../source/index.js';

/*
The error a call threw, or a failure of the test itself.

`assert.fail()` inside a `try` throws an `AssertionError` that the `catch` next to it swallows, so the failure would become the thing being inspected. The failure has to be raised outside any `catch` that would eat it.
*/
function thrownBy(action: () => void): Error {
	try {
		action();
	} catch (error) {
		return error as Error;
	}

	assert.fail('expected a throw');
}

test('assertNever()', () => {
	assert.throws(() => {
		assertNever('unexpected' as never);
	}, {
		// A string is JSON-quoted, so the empty string still shows up.
		message: 'Unreachable: `"unexpected"`',
	});

	assert.throws(() => {
		assertNever('' as never);
	}, {
		message: 'Unreachable: `""`',
	});

	assert.throws(() => {
		assertNever(null as never);
	}, {
		message: 'Unreachable: `null`',
	});

	assert.throws(() => {
		assertNever(undefined as never);
	}, {
		message: 'Unreachable: `undefined`',
	});

	assert.throws(() => {
		assertNever({} as never);
	}, {
		// An object is serialized as JSON, which shows its contents.
		message: 'Unreachable: `{}`',
	});

	assert.throws(() => {
		assertNever(Symbol('x') as never);
	}, {
		message: 'Unreachable: `Symbol(x)`',
	});

	assert.throws(() => {
		assertNever(Object.create(null) as never);
	}, {
		// A null-prototype object still serializes, it just has no prototype to name.
		message: 'Unreachable: `{}`',
	});

	// A value that resists JSON, coercion and the brand read reports nothing rather than throwing.
	const hostile = new Proxy({}, {
		get() {
			throw new Error('boom');
		},
		ownKeys() {
			throw new Error('boom');
		},
		getPrototypeOf() {
			throw new Error('boom');
		},
	});
	assert.throws(() => {
		assertNever(hostile as never);
	}, {
		message: 'Unreachable: `<Unprintable value>`',
	});
});

test('assertNever() describes whatever it is handed', () => {
	// `describeValue` is what produces the text, and it must never throw and must never name a value the caller did not pass. These are the shapes that break a naive `JSON.stringify`.
	const circular: Record<string, unknown> = {};
	circular['self'] = circular;

	const shapes: Array<[string, unknown]> = [
		['a string', 'text'],
		['a number', 42],
		['a non-finite number', NaN],
		['a bigint', 1n],
		['a symbol', Symbol('s')],
		['a boolean', true],
		['null', null],
		['undefined', undefined],
		['an empty object', {}],
		['an object with a nested non-finite number', {a: NaN}],
		['an object holding a bigint', {a: 1n}],
		['an array holding a bigint', [1n]],
		['a circular object', circular],
		['a null-prototype object', Object.assign(Object.create(null), {a: 1})],
		['a symbol-keyed object', {[Symbol('s')]: 1}],
		['a frozen object', Object.freeze({a: 1})],
		['a throwing getter', {
			get a() {
				throw new Error('nope');
			},
		}],
	];

	for (const [label, value] of shapes) {
		assert.throws(() => {
			assertNever(value as never);
		}, (error: unknown) => {
			assert.ok(error instanceof Error, label);
			assert.match((error as Error).message, /^Unreachable: `/v, label);
			return true;
		}, label);
	}

	// Regression guard: these all serialize to `{}`, which names none of them, so their own text is used instead.
	for (const [value, description] of [
		[new Map([['a', 1]]), '[object Map]'],
		[new Set([1]), '[object Set]'],
		[new Error('boom'), 'Error: boom'],
		[/abc/gv, '/abc/gv'],
	] as const) {
		assert.throws(() => {
			assertNever(value as never);
		}, {message: `Unreachable: \`${description}\``});
	}

	// Regression: an error with extra own properties is still described by its message, not by those properties.
	assert.throws(() => {
		assertNever(Object.assign(new Error('boom'), {code: 'E1'}) as never);
	}, {message: 'Unreachable: `Error: boom`'});

	// The same for an error from another realm, which `instanceof` misses.
	assert.throws(() => {
		assertNever(runInNewContext('Object.assign(new Error("boom"), {code: "E1"})') as never);
	}, {message: 'Unreachable: `Error: boom`'});

	// Regression: an invalid `Date` serializes to `null` through its `toJSON()`, which names a value that was never passed.
	assert.throws(() => {
		assertNever(new Date(NaN) as never);
	}, {message: 'Unreachable: `Invalid Date`'});

	// A value whose text cannot be read keeps the `{}` it already serialized to.
	for (const value of [
		new (class {
			get [Symbol.toStringTag](): string {
				throw new Error('nope');
			}
		})(),
		new Proxy({}, {
			getPrototypeOf() {
				throw new Error('nope');
			},
		}),
	]) {
		assert.throws(() => {
			assertNever(value as never);
		}, {message: 'Unreachable: `{}`'});
	}

	// A class instance has only the generic `[object Object]` text, so it keeps `{}`.
	class Empty {}
	assert.throws(() => {
		assertNever(new Empty() as never);
	}, {message: 'Unreachable: `{}`'});
});

test('assertNever() keeps its message short', () => {
	// The documentation calls the description a "short readable string", so it is bounded: a megabyte-long value must not produce a megabyte-long message, which is a log line nobody can read and a stack frame nobody can paste.
	const long = 'x'.repeat(100_000);
	const message = (() => {
		try {
			assertNever(long as never);
			return '';
		} catch (error) {
			return (error as Error).message;
		}
	})();

	// The description is capped, and the message around it is a fixed frame, so the whole thing is.
	assert.ok(message.length < 1100, `message is ${message.length} characters`);
	assert.ok(message.startsWith('Unreachable: `"xxx'), message.slice(0, 20));
	assert.ok(message.endsWith('…`'), message.slice(-10));

	// A value that is already short is untouched.
	const short = thrownBy(() => {
		assertNever('x'.repeat(50) as never);
	});
	assert.equal(short.message, `Unreachable: \`"${'x'.repeat(50)}"\``);

	// A character outside the basic plane is not cut in half, in either direction, which would leave a lone surrogate behind that nothing can render.
	// The cut has to land in the middle of one of these to be a problem, so each is padded past the limit with the interesting unit sitting right at it.
	const cases = [
		['a high surrogate', `${'x'.repeat(999)}\uD83D${'z'.repeat(5)}`],
		['a lone low surrogate', `${'x'.repeat(999)}\uDE00${'z'.repeat(5)}`],
		['a whole pair', `${'x'.repeat(998)}😀${'z'.repeat(5)}`],
	];

	for (const [label, value] of cases) {
		const text = thrownBy(() => {
			assertNever(value as never);
		}).message;

		for (const character of text) {
			const code = character.codePointAt(0)!;
			assert.ok(code < 0xD8_00 || code > 0xDF_FF, `${label}: lone surrogate left behind in ${JSON.stringify(text.slice(-8))}`);
		}
	}

	// A self-referencing object is the one `JSON.stringify()` refuses, so it reaches the `String()` fallback, and a `toJSON` is followed like `JSON.stringify()` does.
	const selfReferencing: Record<string, unknown> = {a: 1};
	selfReferencing['self'] = selfReferencing;

	const selfDescribed = thrownBy(() => {
		assertNever(selfReferencing as never);
	});
	assert.equal(selfDescribed.message, 'Unreachable: `[object Object]`');

	const custom = thrownBy(() => {
		assertNever({toJSON: () => 'custom'} as never);
	});
	assert.equal(custom.message, 'Unreachable: `"custom"`');

	// The cut is marked where it happened, and adds no bracket the value never had.
	const truncated = thrownBy(() => {
		assertNever({a: 'y'.repeat(3000)} as never);
	});
	assert.match(truncated.message, /\{"a":"y+…`$/v);
});

// A slice can cut a surrogate pair in half, and that half is replaced. A lone surrogate in a string value is already escaped by `JSON.stringify()`, so only a pair split by the cut needs the repair.
test('assertNever() repairs a surrogate pair split by truncation', () => {
	// The opening quote takes one unit, so the pair's high half is the last unit kept.
	const split = thrownBy(() => {
		assertNever(`${'x'.repeat(998)}😀suffix` as never);
	});
	assert.equal(split.message, `Unreachable: \`"${'x'.repeat(998)}\u{FFFD}…\``);

	// A pair that fits is kept whole.
	const whole = thrownBy(() => {
		assertNever(`${'x'.repeat(997)}😀suffix` as never);
	});
	assert.equal(whole.message, `Unreachable: \`"${'x'.repeat(997)}😀…\``);

	// A lone surrogate in the value is escaped, so nothing is replaced.
	const lone = thrownBy(() => {
		assertNever('\uDE00' as never);
	});
	assert.equal(lone.message, 'Unreachable: `"\\ude00"`');
});
