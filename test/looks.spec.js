describe('looks', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    describe('initial values', function() {
        var result;

        before(function() {
            content = utils.getProjectXml('costume-size');
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            bin = snap2js.compile(content);
            bin(cxt);
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

        before(function() {
            content = utils.getProjectXml('all-looks');
            bin = snap2js.compile(content);
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

        it('should be able to compile v6 blocks', function() {
            const content = utils.getProjectXml('all-looksv2');
            snap2js.compile(content);
        })
    });
});
