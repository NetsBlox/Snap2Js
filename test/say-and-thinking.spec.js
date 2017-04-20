describe('say and think', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        isRightAfter = require('./utils').isRightAfter,
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'say-and-think.xml'));
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
                totalOrder = val.value;
            };
            snap2js.compile(content)
                .then(bin => {
                    bin(cxt);
                    setTimeout(function() {
                        console.log(totalOrder);
                        done();
                    }, 1000);
                })
                .fail(err => console.error(err));
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
