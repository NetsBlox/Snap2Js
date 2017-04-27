describe('custom blocks', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');

    // TODO: test the scoping of the custom blocks
    // TODO: test different types of inputs
    describe('sum numbers', function() {
        before(function() {
            result = utils.compileAndRun('custom-block');
        });

        it('should evaluate custom block correctly', function() {
            assert.equal(result, 7);
        });

    });

});
