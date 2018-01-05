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

        describe('repeat loop', function() {
            it('should support async conditions (true)', function(done) {
                utils.compileAndRun('do-if-true-async')
                    .then(result => assert.equal(result, true))
                    .nodeify(done);
            });

            it('should support async conditions (false)', function(done) {
                utils.compileAndRun('do-if-false-async')
                    .then(result => assert.equal(result, false))
                    .nodeify(done);
            });
        });

        describe('repeatUntil', function() {
            it('should support async conditions (true)', function(done) {
                utils.compileAndRun('do-if-true-async-repeat-until')
                    .then(result => assert.equal(result, true))
                    .nodeify(done);
            });

            it('should support async conditions (false)', function(done) {
                utils.compileAndRun('do-if-false-async-repeat-until')
                    .then(result => assert.equal(result, false))
                    .nodeify(done);
            });
        });
    });
});
