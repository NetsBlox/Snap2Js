describe('looks', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    describe('initial values', function() {
        var result;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'costume-size.xml'));
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            snap2js.compile(content)
                .then(bin => bin(cxt))
                .nodeify(done);
        });

        it('should set costume number to 3', function() {
            assert.equal(result[1], 3)
        });

        it('should set size to 66', function() {
            assert.equal(result[0], 66)
        });
    });

    describe('all look blocks', function() {
        var bin,
            cxt;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'all-looks.xml'));
            snap2js.compile(content)
                .then(_bin => bin = _bin)
                .nodeify(done);
        });

        it('should switch to Turtle costume', function(done) {
            cxt = snap2js.newContext();
            cxt['doSwitchToCostume'] = costume => {
                assert.equal(costume, 'Turtle');
                done();
            };
            bin(cxt);
        });

        it('should change fisheye effect', function(done) {
            cxt = snap2js.newContext();
            cxt['changeEffect'] = (effect, amount) => {
                assert.equal(effect, 'fisheye');
                assert.equal(amount, 25);
                done();
            };
            bin(cxt);
        });

        it('should change scale by 10', function(done) {
            cxt = snap2js.newContext();
            cxt['changeScale'] = amount => {
                assert.equal(amount, 10);
                done();
            };
            bin(cxt);
        });

        it('should go back 1 layer', function(done) {
            cxt = snap2js.newContext();
            cxt['goBack'] = amount => {
                assert.equal(amount, 1);
                done();
            };
            bin(cxt);
        });
    });
});
