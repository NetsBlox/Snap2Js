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

    describe.skip('broadcast', function() {
        it('should trigger given hat block', function(done) {
            let cxt = snap2js.newContext();

            cxt['doReport'] = val => {
                assert.equal(val, 'success!');
                done();
            };
            bin = utils.getCompiledVersionOf('broadcast');
            bin(cxt);
        });
        // TODO: test broadcast and wait
        // TODO: test broadcast to 'any message'
    });

    // Test:
    //  - cloning
    //  - pausing
    //  - broadcasting
    //  - fork
});
