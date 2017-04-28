describe('control', function() {
    const utils = require('./utils');
    const assert = require('assert');

    // It's not really safe to run the generated code...
    describe('all blocks', function() {

        it('should compile', function() {
            bin = utils.getCompiledVersionOf('all-control');
            assert.equal(typeof bin, 'function');
        });
    });

    // Test:
    //  - doUntil
    //  - cloning
    //  - pausing
    //  - broadcasting
    //  - fork
});
