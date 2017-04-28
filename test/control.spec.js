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

    //describe('cloning', function() {
        //it('should support broadcast and wait', function(done) {
    //});

    // Test:
    //  - cloning
    //  - pausing
    //  - fork
});
