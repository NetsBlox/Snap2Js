describe('concurrency', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = utils.getProjectXml('loops-and-waits');
    });

    describe('transpile', function() {
        let code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should not contain "doWarp"', function() {
            assert(!/\bdoWarp\b/.test(code));
        });

        it('should contain "for"', function() {
            assert(/for\s*\(/.test(code));
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            values = [],
            totalOrder;

        before(function(done) {
            this.timeout(5000);
            cxt = snap2js.newContext();
            cxt['bubble'] = val => {
                values.push(val);
                if (values.length === 2) {
                    totalOrder = values[1];
                    done();
                }
            };
            bin = snap2js.compile(content);
            bin(cxt);
        });

        // Things to check:
        //  - wait block yields
        //  - end of loop yields

        it('should yield after wait block', function() {
            assert.notEqual(totalOrder[1], '2');
            assert.notEqual(totalOrder[1], '22');
        });

        it('should yield after doSayFor', function() {
            assert(!utils.isRightAfter(totalOrder, '13', '14'))
        });

        it('should yield after repeat loop', function() {
            assert(!utils.isRightAfter(totalOrder, '15', '16'))
        });

        it('should not yield after repeat in warp', function() {
            assert(utils.isRightBefore(totalOrder, '27.5', '28'));
        });
    });
});
