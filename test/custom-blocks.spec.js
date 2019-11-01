describe.only('custom blocks', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');

    describe('sum numbers', function() {
        before(async function() {
            result = await utils.compileAndRun('custom-block');
        });

        it('should evaluate custom block correctly', function() {
            assert.equal(result, 7);
        });

    });

    describe('all inputs', function() {
        before(async function() {
            result = await utils.compileAndRun('custom-block-inputs');
        });

        [
            ['boolean', true],
            ['list', ['1', '2']],
            ['number', 3],
            ['cmd ring', val => typeof val === 'function'],
            ['reporter ring', {in: 3, out: 4}],
            ['predicate ring', {in: false, out: true}],
            ['cslot', val => typeof val === 'function'],
            ['any input', 'asdf'],
            ['boolUE', false],
            ['year', val => val === new Date().getFullYear()]
        ].forEach((pair, index) => {
            let [type, value] = pair;

            it(`should evaluate ${type}`, function() {
                if (value instanceof Array) {
                    value.forEach((el, i) => {
                        assert.equal(result[index][i], el);
                    });
                } else if (value instanceof Function) {
                    assert(value(result[index]));
                } else if (value instanceof Object) {
                    fn = result[index];

                    console.log(fn.toString());
                    console.log('-----\n', fn(value.in));

                    const output = fn(value.in);
                    assert.equal(output, value.out);
                } else {
                    assert.equal(result[index], value);
                }
            });
        });

        describe('complex cases', function() {
            var bin;

            before(function() {
                bin = utils.getCompiledVersionOf('custom-block-inputs');
            });

            it('should invoke "forward" in first anon fn', function(done) {
                var cxt = snap2js.newContext(),
                    fn;

                cxt['forward'] = dist => {
                    assert.equal(dist, 13);
                    done();
                };

                cxt['doReport'] = r => result = r;
                bin(cxt);
                fn = result[3];
                fn(13);
            });

            it('should wrap cslot in fn', function(done) {
                var cxt = snap2js.newContext(),
                    result,
                    fn;

                cxt['bubble'] = msg => {
                    assert.equal(msg, 'Hello!');
                    done();
                };

                cxt['doReport'] = r => result = r;
                bin(cxt);
                fn = result[6];
                fn();
            });

            it('should get "stage"', function(done) {
                var cxt = snap2js.newContext(),
                    result,
                    fn;

                cxt['doReport'] = () => {};
                cxt['reportGet'] = thing => {
                    assert.equal(thing, 'stage');
                    done();
                };

                bin(cxt);
            });
        });

        describe('cslot', function() {
            before(function() {
                bin = utils.getCompiledVersionOf('custom-block-cslot');
            });

            it('should move 5 times', function(done) {
                var cxt = snap2js.newContext(),
                    count = 0;

                cxt['forward'] = () => {
                    count++;
                    if (count === 5) done();
                };
                bin(cxt);
            });
        });

    });

    describe('local sum numbers', function() {
        describe('sprite', function() {
            before(async function() {
                result = await utils.compileAndRun('local-custom-sum');
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 11);
            });
        });

        describe('stage', function() {
            before(async function() {
                result = await utils.compileAndRun('stage-custom-sum');
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 6);
            });
        });
    });

    describe('yielding', function() {
        let trace, recResult, iterResult;
        const AFTER_ITER = -7;
        const AFTER_REC = 7;
        const isIterativeStep = value => value < 0;
        const isRecursiveStep = value => value > 0;
        before(async () => {
            const name = 'recursive-and-iterative-custom-blocks';
            [trace, recResult, iterResult] = await utils.compileAndRun(name);
            trace = trace.map(v => +v);
        });

        it('should wait until iter block completes before next command', function() {
            const nextCommandIndex = trace.findIndex(v => v === AFTER_ITER);
            const nextIterative = trace.slice(nextCommandIndex + 1).find(isIterativeStep);
            assert(
                !nextIterative,
                'Found iterative step after iterative block termination: ' + nextIterative
            );
        });

        it('should wait until rec block completes before next command', function() {
            const nextCommandIndex = trace.findIndex(v => v === AFTER_REC);
            const nextRec = trace.slice(nextCommandIndex + 1).find(isRecursiveStep);
            assert(
                !nextRec,
                'Found iterative step after iterative block termination: ' + nextRec
            );
        });

        it('should yield during iterative block', function() {
            const iterIndices = trace.map((v, i) => {
                if (isIterativeStep(v)) {
                    return i;
                }
                return -1;
            })
            .filter(index => index !== -1);

            let doesYield = false;
            iterIndices.reduce((current, next) => {
                if (next - current !== 1) {
                    doesYield = true;
                }
                return next;
            });
            assert(doesYield, 'Iterative block yields. Trace: ' + trace.join(', '));
        });

        it('should not yield during recursion', function() {
            const recIndices = trace.map((v, i) => {
                if (isRecursiveStep(v)) {
                    return i;
                }
                return -1;
            })
            .filter(index => index !== -1);

            let doesYield = false;
            recIndices.reduce((current, next) => {
                if (next - current !== 1) {
                    doesYield = true;
                }
                return next;
            });
            assert(!doesYield, 'Yield found. Trace: ' + trace.join(', '));
        });

        it('should not yield on (iter) custom block termination', function() {
            const nextCommandIndex = trace.findIndex(v => v === AFTER_ITER);
            const prevStep = trace[nextCommandIndex - 1];
            assert(isIterativeStep(prevStep), 'Yield found after iterative block');
        });

        it('should not yield on (rec) custom block termination', function() {
            const nextCommandIndex = trace.findIndex(v => v === AFTER_REC);
            const prevStep = trace[nextCommandIndex - 1];
            assert(isRecursiveStep(prevStep), 'Yield found after recursive block');
        });

        it('should correct value from iterative block', function() {
            assert.equal(iterResult, 120);
        });

        it('should correct value from recursive block', function() {
            assert.equal(recResult, 120);
        });
    });
});
