describe('concurrency', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'loops-and-waits.xml'));
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content)
        });

        it('should contain "doWarp"', function() {
            assert(/doWarp.call\([^'"]/.test(code));
        });

        it('should not contain "for"', function() {
            assert.equal(/for\s*\(/.test(code), false);
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            values = [],
            totalOrder;

        before(function(done) {
            cxt = snap2js.newContext();
            cxt['bubble'] = val => values.push(val);
            bin = snap2js.compile(content);
            bin(cxt);
            setTimeout(function() {
                totalOrder = values[1];
                done();
            }, 1500);
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
