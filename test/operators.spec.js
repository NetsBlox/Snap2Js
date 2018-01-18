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
        before(function(done) {
            utils.compileAndRun('basic-math')
                .then(res => result = res)
                .nodeify(done);
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

    describe('reportMonadic', function() {
        it('should support computing the sqrt from context', function(done) {
            const content = utils.getContextXml('report-monadic');
            const fn = snap2js.compile(content)(snap2js.newContext());
            fn().then(result => {
                assert.equal(+result, 3);
                done();
            });
        });

        describe('all ops', function() {
            let fns = null;
            before(done => {
                utils.compileAndRun('report-monadic').then(result => {
                    fns = result;
                    done();
                });
            });

            [
                ['sqrt'],
                ['abs'],
                ['ceiling'],
                ['floor'],
                ['sin', Math.sin],
                ['cos', Math.cos],
                ['tan', Math.tan],
                ['asin', Math.asin],
                ['acos', Math.acos],
                ['atan', Math.atan],
                ['ln', Math.log],
                ['log', x => Math.log(x) / Math.LN10],
                ['e^', Math.exp],
                ['10^', Math.pow.bind(null, 10)],
                ['undefined', () => 0]
            ].forEach((pair, i) => {
                const [name, grader] = pair;
                it(`should compute ${name}`, function() {
                    const blockFn = fns[i];
                    blockFn().then(result => {
                        const expected = grader ? grader(3) : 3;
                        assert.equal(result, expected);
                    });
                });
            });
        });
    });

    describe('random', function() {
        before(function(done) {
            utils.compileAndRun('random')
                .then(res => result = res)
                .nodeify(done);
        });

        it('should not generate equal random numbers', function() {
            var areSame = !result.find(v => v !== result[0]);
            assert(result[0] !== undefined);
            assert(!areSame);
        });

    });

    describe('comparisons', function() {
        before(function(done) {
            utils.compileAndRun('comparisons')
                .then(res => result = res)
                .nodeify(done);
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
        before(function(done) {
            utils.compileAndRun('string-ops')
                .then(res => result = res)
                .nodeify(done);
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
        before(function(done) {
            utils.compileAndRun('boolean')
                .then(res => result = res)
                .nodeify(done);
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

        describe('js', function() {
            before(function(done) {
                utils.compileAndRun('js-fn')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should return a fn', function() {
                assert.equal(typeof result, 'function');
            });

            it('should eval correctly (add 5 to input)', function() {
                assert.equal(result(3), 8);
            });
        });

        describe('invalid js names', function() {
            before(function(done) {
                utils.compileAndRun('fn-names')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should return a fn', function() {
                assert.equal(typeof result, 'function');
            });

            it('should eval correctly (and+and+not)', function() {
            });
        });

        describe('predicate-ring', function() {
            before(function(done) {
                utils.compileAndRun('predicate-ring')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should return a fn', function() {
                assert.equal(typeof result, 'function');
            });

            it('should eval true correctly (and+and+not)', function(done) {
                result(true, true, false).then(value => {
                    assert.equal(value, true);
                    done();
                });
            });

            it('should eval false correctly (and+and+not)', function(done) {
                result(true, true, true).then(value => {
                    assert.equal(value, false);
                    done();
                });
            });
        });

        describe('reporter-ring', function() {
            before(function(done) {
                utils.compileAndRun('reporter-ring')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should return a fn', function() {
                assert.equal(typeof result, 'function');
            });

            it('should eval correctly (sum inputs)', function(done) {
                result(3, 5).then(value => {
                    assert.equal(value, 8);
                    done();
                });
            });
        });

        describe('cmd-ring', function() {
            var bin;

            before(function() {
                bin = utils.getCompiledVersionOf('cmd-ring');
            });

            it('should return a fn', function(done) {
                utils.compileAndRun('cmd-ring')
                    .then(result => {
                        assert.equal(typeof result, 'function', result.toString());
                    })
                    .nodeify(done);
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
