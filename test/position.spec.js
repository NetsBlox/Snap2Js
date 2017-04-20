describe('position', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'initial-set-change-pos.xml'));
    });

    describe('compile', function() {
        var bin,
            cxt,
            result;

        before(function(done) {
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            snap2js.compile(content)
                .then(bin => bin(cxt))
                .nodeify(done);
        });

        // Things to check:
        //  - wait block yields
        //  - end of loop yields

        it('should have x position of 100', function() {
            assert.equal(result[0], 100);
        });

        it('should have y position of 320', function() {
            assert.equal(result[1], 320);
        });

        it('should have direction of 58', function() {
            assert.equal(result[2], 58);
        });
    });
});
