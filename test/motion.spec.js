describe('motion', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    describe.only('position', function() {
        var bin,
            cxt,
            result;

        before(function() {
            content = utils.getProjectXml('initial-set-change-pos');
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            bin = snap2js.compile(content);
            bin(cxt);
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

        before(function() {
            content = utils.getProjectXml('forward-angle');
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            bin = snap2js.compile(content);
            bin(cxt);
        });

        it('should update x,y after angled move forward', function() {
            assert.equal(Math.floor(result[0]), 168);
            assert.equal(Math.floor(result[1]), 545);
        });
    });

    describe('all motion blocks', function() {
        before(function() {
            content = utils.getProjectXml('all-motion');
        });

        it('should compile without error', function() {
            snap2js.compile(content);
        });
    });
});
