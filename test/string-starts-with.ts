import {test} from 'node:test';
import assert from 'node:assert/strict';
import {expectTypeOf} from 'expect-type';
import {stringStartsWith} from '../source/index.js';

test('stringStartsWith() matches String#startsWith()', () => {
	assert.equal(stringStartsWith('onClick', 'on'), true);
	assert.equal(stringStartsWith('href', 'on'), false);
	assert.equal(stringStartsWith('anything', ''), true);
	assert.equal(stringStartsWith('xonClick', 'on', 1), true);
	assert.equal(stringStartsWith('onClick', 'on', 1), false);
});

test('stringStartsWith() narrows a union of literals in both branches', () => {
	type Name = 'onClick' | 'onHover' | 'href';

	function check(name: Name) {
		if (stringStartsWith(name, 'on')) {
			expectTypeOf(name).toEqualTypeOf<'onClick' | 'onHover'>();
			return 'event';
		}

		expectTypeOf(name).toEqualTypeOf<'href'>();
		return 'attribute';
	}

	assert.equal(check('onClick'), 'event');
	assert.equal(check('href'), 'attribute');
});

test('stringStartsWith() keeps the whole union in the false branch when no member matches', () => {
	const name = 'href' as 'onClick' | 'href';

	if (stringStartsWith(name, 'zz')) {
		expectTypeOf(name).toBeNever();
	} else {
		expectTypeOf(name).toEqualTypeOf<'onClick' | 'href'>();
	}
});

test('stringStartsWith() narrows a wide string to a template literal', () => {
	const key: string = 'data-id';

	if (stringStartsWith(key, 'data-')) {
		expectTypeOf(key).toEqualTypeOf<`data-${string}`>();
	} else {
		expectTypeOf(key).toEqualTypeOf<string>();
	}
});

test('stringStartsWith() returns a boolean for a search string that is not one literal', () => {
	type Name = 'onClick' | 'href';
	const name = 'href' as Name;

	// The runtime checks only the one prefix it is given, so a `false` result says nothing about a member that starts with the other one.
	const prefix = 'hr' as 'on' | 'hr';
	expectTypeOf(stringStartsWith(name, prefix)).toEqualTypeOf<boolean>();
	if (!stringStartsWith(name, prefix)) {
		expectTypeOf(name).toEqualTypeOf<Name>();
	}

	const widePrefix: string = 'on';
	expectTypeOf(stringStartsWith(name, widePrefix)).toEqualTypeOf<boolean>();

	const templatePrefix = 'on' as `o${string}`;
	expectTypeOf(stringStartsWith(name, templatePrefix)).toEqualTypeOf<boolean>();

	// A position moves the start, so the prefix is not at the start of the string.
	expectTypeOf(stringStartsWith(name, 'on', 1)).toEqualTypeOf<boolean>();
});

test('stringStartsWith() narrows in a filter callback', () => {
	const names = ['onClick', 'href', 'onHover'] as const;
	const events = names.filter(name => stringStartsWith(name, 'on'));

	expectTypeOf(events).toEqualTypeOf<Array<'onClick' | 'onHover'>>();
	assert.deepEqual(events, ['onClick', 'onHover']);
});

test('stringStartsWith() does not narrow for a branded literal prefix', () => {
	type Name = 'onClick' | 'href';
	const prefix = 'on' as 'on' & {readonly brand: unique symbol};

	function check(name: Name) {
		if (stringStartsWith(name, prefix)) {
			expectTypeOf(name).toEqualTypeOf<Name>();
			return true;
		}

		expectTypeOf(name).toEqualTypeOf<Name>();
		return false;
	}

	assert.equal(check('onClick'), true);
	assert.equal(check('href'), false);

	const names: Name[] = ['onClick', 'href'];
	const events = names.filter(name => stringStartsWith(name, prefix));
	expectTypeOf(events).toEqualTypeOf<Name[]>();
	assert.deepEqual(events, ['onClick']);
});
