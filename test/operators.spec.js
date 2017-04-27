describe('operators', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');
    const createTest = (pair, index) => {
        it('should ' + pair[0] + ' correctly', function() {
            assert.equal(result[index], pair[1]);
        });
    };

    describe('basic math', function() {
        before(function() {
            result = utils.compileAndRun('basic-math');
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
        before(function() {
            result = utils.compileAndRun('random');
        });

        it('should not generate equal random numbers', function() {
            var areSame = !result.find(v => v !== result[0]);
            assert(result[0] !== undefined);
            assert(!areSame);
        });

    });

    describe('comparisons', function() {
        before(function() {
            result = utils.compileAndRun('comparisons');
        });

        [
            ['2 < 3', true],
            ['11 < 3', false],
            ['2 > 3', false],
            ['2 > 1', true],
            ['3 == 11', false],
            ['11 == 11.0', true]
        ].forEach(createTest);
    });

    describe('text', function() {
        before(function() {
            result = utils.compileAndRun('string-ops');
        });

        it('should join words "hello", "world", "there"', function() {
            assert.equal(result[0], 'hello world there');
        });

        it('should split words "hello world"', function() {
            assert.equal(result[1][0], 'hello');
            assert.equal(result[1][1], 'world');
        });

        it('should get the length of "world"', function() {
            assert.equal(result[2], 5);
        });

    });

    describe('boolean', function() {
        before(function() {
            result = utils.compileAndRun('boolean');
        });

        it('should support AND', function() {
            assert.equal(result[0], true);
        });

        it('should support OR', function() {
            assert.equal(result[1], false);
        });

        it('should support NOT', function() {
            assert.equal(result[2], false);
        });

        it('should support nested NOT', function() {
            assert.equal(result[3], true);
        });

        it('should support "identical to"', function() {
            assert.equal(result[4], false);
        });

        it('should support "is a number"', function() {
            assert.equal(result[6], true);
        });

        it('should support creating js fns', function() {
            assert.equal(typeof result[7], 'function');
        });

    });

    describe('functions', function() {
        // TODO: add tests for anonymous functions
        // TODO: reporter rings
        // TODO: pred rings

        describe('js', function() {
            before(function() {
                result = utils.compileAndRun('js-fn');
            });

            it('should return a fn', function() {
                assert.equal(typeof result, 'function');
            });

            it('should eval correctly (add 5 to input)', function() {
                assert.equal(result(3), 8);
            });
        });

        describe('cmd-ring', function() {
            var bin;

            before(function() {
                bin = utils.getCompiledVersionOf('cmd-ring');
            });

            it('should return a fn', function() {
                result = utils.compileAndRun('cmd-ring');
                assert.equal(typeof result, 'function', result.toString());
            });

            it('should move forward by 100', function(done) {
                var cxt = snap2js.newContext();
                cxt['forward'] = value => {
                    assert.equal(value, 100);
                    done();
                };
                bin(cxt);
            });

            it('should turn 45 degrees', function(done) {
                var cxt = snap2js.newContext();
                cxt['turn'] = value => {
                    assert.equal(value, 45);
                    done();
                };
                bin(cxt);
            });
        });
    });

});
