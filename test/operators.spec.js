describe.only('operators', function() {
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');

    describe('basic math', function() {
        before(function() {
            let cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            bin = utils.getCompiledVersionOf('basic-math');
            bin(cxt);
        });

        it('should add numbers', function() {
            assert.equal(result[0], 6);
        });

        it('should subtract numbers', function() {
            assert.equal(result[1], -2);
        });

        it('should multiply numbers', function() {
            assert.equal(result[2], 8);
        });

        it('should divide numbers', function() {
            assert.equal(result[3], 17);
        });

        it('should mod numbers', function() {
            assert.equal(result[4], 3);
        });

        it('should round numbers', function() {
            assert.equal(result[5], 2);
        });
    });

    describe('random', function() {
        // TODO
    });

    describe('text', function() {
        // TODO
    });

    describe('boolean', function() {
        // TODO
    });
});
