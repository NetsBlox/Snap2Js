describe('concurrency', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'loops-and-waits.xml'));
    });

    describe('transpile', function() {
        var code;

        before(function(done) {
            snap2js.transpile(content)
                .then(js => {
                    console.log('code is', js);
                    code = js;
                })
                .nodeify(done);
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
            snap2js.compile(content)
                .then(bin => {
                    bin(cxt);
                    setTimeout(function() {
                        totalOrder = values[1].value;
                        console.log(totalOrder);
                        done();
                    }, 1000);
                })
                .fail(err => console.error(err));
        });

        // Things to check:
        //  - wait block yields
        //  - end of loop yields

        it.only('should yield after wait block', function() {
            assert.notEqual(totalOrder[1], '2');
            assert.notEqual(totalOrder[1], '22');
        });

        it('should yield after repeat loop', function() {
            // one ends on 15,16
            var i = totalOrder.indexOf('15');
            assert.notEqual(totalOrder[i+1], '16');
        });
    });
});
