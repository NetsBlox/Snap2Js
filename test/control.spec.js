describe('control', function() {
    const utils = require('./utils');
    const assert = require('assert');
    const snap2js = require('..');

    describe('all blocks', function() {
        // It's not really safe to run the generated code...
        it('should compile', function() {
            bin = utils.getCompiledVersionOf('all-control');
            assert.equal(typeof bin, 'function');
        });
    });

    describe('doUntil', function() {
        it('should loop until count == 61', async function() {
            const count = await utils.compileAndRun('repeat-until');
            assert.equal(count, 61);
        });
    });

    describe('broadcast', function() {

        it('should trigger given hat block', async function() {
            const result = await utils.compileAndRun('broadcast-and-wait-any-msg');
            assert.equal(result, 'success!');
        });

        it('should trigger given hat block w/ any-msg', async function() {
            const result = await utils.compileAndRunUntilReport('broadcast-any-msg');
            assert.equal(result, 'success!');
        });

        it('should support broadcast and wait', async function() {
            const list = await utils.compileAndRunUntilReport('broadcast-wait');
            list.forEach((el, i) => assert.equal(i+1, el));
        });
    });

    describe('cloning', function() {
        it('should support cloning self', async function() {
            const trace = await utils.compileAndRunUntilReport('cloning');
            assert.deepEqual(trace, ['1', '3', '2']);
        });

        it('should support cloning others', async function() {
            const trace = await utils.compileAndRun('clone-other');
            assert.equal(trace, 'success');
        });
    });

    describe('forking', function() {
        it('should support forking', async function() {
            const trace = await utils.compileAndRunUntilReport('fork');
            assert.deepEqual(trace, ['1', '3', '2']);
        });
    });

    describe('doIf', function() {

        describe('basic compilation', function() {
            it('should correctly detect the body', async function() {
                const result = await utils.compileAndRun('empty-if-cond');
            });
        });

        describe('repeat loop', function() {
            [true, false].forEach(cond => {
                const COND_FN = '2';
                const COND_FN_LOOP = '2.5';
                const IF_BODY = '3';
                const AFTER_IF = '4';
                const CONC_CODE = '1';

                describe(`async conditions (${cond})`, function() {
                    let trace;
                    before(async () => {
                        trace = await utils.compileAndRun(`do-if-${cond}-async`);
                    });

                    it('should evaluate the condition once', function() {
                        const evalCount = trace.filter(i => i === COND_FN).length;
                        assert.equal(evalCount, 1);
                    });

                    it('should evaluate loop 5 times', function() {
                        const evalCount = trace.filter(i => i === COND_FN_LOOP).length;
                        assert.equal(evalCount, 5);
                    });

                    it('should alternate btwn loops', function() {
                        trace.forEach((value, index) => {
                            if (value === COND_FN_LOOP) {
                                assert.notEqual(COND_FN_LOOP, trace[index + 1])
                            }
                        });
                    });

                    it(`should ${cond ? 'not ' : ''}evaluate after if`, function() {
                        assert.equal(!trace.find(i => i == AFTER_IF), cond);
                    });

                    it(`should ${cond ? '': 'not '}evaluate body of if statement`, function() {
                        assert.equal(!!trace.find(i => i == IF_BODY), cond);
                    });

                });

                describe(`sync conditions (${cond})`, function() {
                    let trace;
                    before(async () => {
                        trace = await utils.compileAndRun(`do-if-${cond}-sync`);
                    });

                    it('should evaluate the condition once', function() {
                        const evalCount = trace.filter(i => i === COND_FN).length;
                        assert.equal(evalCount, 1);
                    });

                    it('should evaluate condition before loop runs twice', function() {
                        assert.notDeepEqual(trace.slice(0, 2), ['1', '1']);
                    });

                    it(`should ${cond ? 'not ' : ''}evaluate after if`, function() {
                        assert.equal(!trace.find(i => i == AFTER_IF), cond);
                    });

                    it(`should ${cond ? '': 'not '}evaluate body of if statement`, function() {
                        assert.equal(!!trace.find(i => i == IF_BODY), cond);
                    });
                });
            });
        });

        describe('repeatUntil', function() {
            it('should support async conditions (true)', async function() {
                const result = await utils.compileAndRun('do-if-true-async-repeat-until')
                assert.equal(result, true);
            });

            it('should support async conditions (false)', async function() {
                const result = await utils.compileAndRun('do-if-false-async-repeat-until')
                assert.equal(result, false);
            });
        });
    });
});
