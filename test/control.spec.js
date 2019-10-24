describe('control', function() {
    const utils = require('./utils');
    const assert = require('assert');
    const snap2js = require('..');

    // It's not really safe to run the generated code...
    describe('all blocks', function() {

        it('should compile', function() {
            bin = utils.getCompiledVersionOf('all-control');
            assert.equal(typeof bin, 'function');
        });
    });

    describe('doUntil', function() {
        let iterCount = 0;

        before(function(done) {
            let cxt = snap2js.newContext();

            cxt['bubble'] = () => {
                iterCount++;
            };
            cxt['doReport'] = () => done();
            bin = utils.getCompiledVersionOf('repeat-until');
            bin(cxt);
        });

        it('should loop at least once', function() {
            assert.notEqual(iterCount, 0);
        });

        it('should perform 16 iterations ', function() {
            assert.equal(iterCount, 16);
        });
    });

    describe('broadcast', function() {

        it('should trigger given hat block', function(done) {
            utils.compileAndRun('broadcast-any-msg')
                .then(result => {
                    assert.equal(result, 'success!');
                })
                .nodeify(done);
        });

        it('should trigger given hat block w/ any-msg', function(done) {
            utils.compileAndRun('broadcast-any-msg')
                .then(result => {
                    assert.equal(result, 'success!');
                })
                .nodeify(done);
        });

        it('should support broadcast and wait', function(done) {
            utils.compileAndRun('broadcast-wait')
                .then(list => {
                    list.forEach((el, i) => {
                        assert.equal(i+1, el);
                    });
                })
                .nodeify(done);
        });
    });

    describe('cloning', function() {
        it('should support cloning self', function(done) {
            utils.compileAndRun('cloning')
                .then(result => assert.equal(result, 'success'))
                .nodeify(done);
        });

        it('should support cloning others', function(done) {
            utils.compileAndRun('clone-other')
                .then(result => assert.equal(result, 'success'))
                .nodeify(done);
        });
    });

    describe('forking', function() {
        it('should support forking', function(done) {
            let cxt = snap2js.newContext();

            cxt['bubble'] = () => {
                iterCount++;
            };
            cxt['doThink'] = list => {
                assert.equal(list[0], 2);
                assert.equal(list[1], 1);
                done();
            };
            bin = utils.getCompiledVersionOf('fork');
            bin(cxt);
        });
    });

    describe('doIf', function() {

        describe('basic compilation', function() {
            it('should correctly detect the body', async function() {
                const result = await utils.compileAndRun('empty-if-cond');
            });
        });

        describe.only('repeat loop', function() {
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
