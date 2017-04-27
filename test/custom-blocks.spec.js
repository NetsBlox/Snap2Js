describe('custom blocks', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');

    // TODO: test different types of inputs
    describe('sum numbers', function() {
        before(function() {
            result = utils.compileAndRun('custom-block');
        });

        it('should evaluate custom block correctly', function() {
            assert.equal(result, 7);
        });

    });

    describe.only('all inputs', function() {
        before(function() {
            result = utils.compileAndRun('custom-block-inputs');
        });

        it('should evaluate custom block correctly', function() {
            assert.equal(result, 7);
        });

    });

    describe('local sum numbers', function() {
        describe('sprite', function() {
            before(function() {
                result = utils.compileAndRun('local-custom-sum');
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 11);
            });
        });

        describe('stage', function() {
            before(function() {
                result = utils.compileAndRun('stage-custom-sum');
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 6);
            });
        });
    });

});
