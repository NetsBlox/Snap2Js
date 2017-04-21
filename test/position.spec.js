describe('motion', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    describe('position', function() {
        var bin,
            cxt,
            result;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'initial-set-change-pos.xml'));
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            snap2js.compile(content)
                .then(bin => bin(cxt))
                .nodeify(done);
        });

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

    describe('turn-forward', function() {
        var bin,
            cxt,
            result;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'forward-angle.xml'));
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            snap2js.compile(content)
                .then(bin => bin(cxt))
                .nodeify(done);
        });

        it('should update x,y after angled move forward', function() {
            assert.equal(Math.floor(result[0]), 168);
            assert.equal(Math.floor(result[1]), 545);
        });
    });

    describe('all motion blocks', function() {
        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'all-motion.xml'));
        });

        it('should compile without error', function(done) {
            snap2js.compile(content)
                .nodeify(done);
        });
    });
});
