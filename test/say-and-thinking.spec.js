describe('say and think', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        isRightAfter = utils.isRightAfter,
        content;

    before(function(){
        content = utils.getProjectXml('say-and-think');
    });

    describe('compile', function() {
        var bin,
            cxt,
            values = [],
            totalOrder;

        before(function(done) {
            cxt = snap2js.newContext();
            cxt['doReport'] = function(val) {
                console.log('reporting', arguments);
                totalOrder = val;
            };
            bin = snap2js.compile(content);
            bin(cxt);
            setTimeout(function() {
                console.log(totalOrder);
                done();
            }, 1000);
        });

        it('should not yield w/ doSay', function() {
            assert(isRightAfter(totalOrder, '1', '2'));
        });

        it('should yield w/ doSayFor', function() {
            assert(!isRightAfter(totalOrder, '2', '3'));
        });

        it('should not yield w/ doThink', function() {
            assert(isRightAfter(totalOrder, '3', '4'));
        });

        it('should yield w/ doThinkFor', function() {
            assert(!isRightAfter(totalOrder, '4', '5'));
        });

    });
});
