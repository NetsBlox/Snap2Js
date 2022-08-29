describe('new-blocks-1320', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');
    const createTest = (pair, index) => {
        it('should ' + pair[0] + ' correctly', function() {
            assert.equal(result[index], pair[1]);
        });
    };

    describe('new blocks 1320', function() {
        before(async function() {
            result = await utils.compileAndRun('new-blocks-1320');
        });

        it('should support variadic sum', function() {
            assert.deepStrictEqual(result[0], [14, 21, 0]);
        });
        it('should support variadic product', function() {
            assert.deepStrictEqual(result[1], [126, 1680, 1]);
        });
    });
});
