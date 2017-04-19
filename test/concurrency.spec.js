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

        it('should contain "for"', function() {
            console.log();
            console.log('code', code);
            assert(/for\s*\([^'"]/.test(code));
        });
    });

});
