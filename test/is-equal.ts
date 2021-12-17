import test from 'ava';
import {isEqualType} from '../source/index.js';

test('isEqual()', t => {

    t.true(isEqualType<1, 1>());
    t.true(isEqualType<any, any>());
    t.true(isEqualType<unknown, unknown>());

    t.false(isEqualType<{}, {x:1}>());
    t.false(isEqualType<1, 2>());
    t.false(isEqualType<1, any>());
    t.false(isEqualType<1, unknown>());
    t.false(isEqualType<any, unknown>());
    
});
