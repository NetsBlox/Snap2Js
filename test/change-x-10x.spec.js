describe('change x 10x', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'change-x-10x.xml'));
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "setXPosition"', function() {
            assert(/setXPosition.call\([^'"]/.test(code));
        });

        it('should not contain "for"', function() {
            assert.equal(/for\s*\(/.test(code), false);
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            xVal = 0;

        before(function() {
            cxt = snap2js.newContext();
            cxt['setXPosition'] = v => xVal = v;
            cxt['changeXPosition'] = v => xVal += v;

            bin = snap2js.compile(content);
        });

        it('should finish with x == 100', function(done) {
            cxt['changeXPosition'] = v => {
                xVal += v;
                if (xVal === 100) done();
            };
            bin(cxt);
        });
    });
});
