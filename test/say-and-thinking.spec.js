describe('say and think', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const utils = require('./utils');
    const isRightAfter = utils.isRightAfter;

    describe('compile', function() {
        let totalOrder;

        before(async function() {
            totalOrder = await utils.compileAndRunUntilReport('say-and-think');
            console.log(totalOrder);
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
