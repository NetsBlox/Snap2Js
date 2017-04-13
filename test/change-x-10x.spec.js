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

        before(function(done) {
            snap2js.transpile(content)
                .then(js => {
                    console.log('code is', js);
                    code = js;
                })
                .nodeify(done);
        });

        it('should contain "setXPosition"', function() {
            assert(/setXPosition\([^'"]/.test(code));
        });

        it('should contain "for"', function() {
            console.log();
            console.log('code', code);
            assert(/for\s*\([^'"]/.test(code));
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            xVal = 0;

        before(function(done) {
            cxt = snap2js.newContext();
            cxt['setXPosition'] = v => xVal = v;
            cxt['changeXPosition'] = v => xVal += v;

            snap2js.compile(content)
                .then(_bin => bin = _bin)
                .nodeify(done);
        });

        it('should finish with x == 100', function(done) {
            cxt['changeXPosition'] = v => {
                xVal += v;
                if (xVal === 100) done();
            };
            console.log(bin.toString());
            bin(cxt);
        });
    });
});
