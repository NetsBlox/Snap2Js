describe('variables', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    describe.only('initial values', function() {
        var bin,
            cxt;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'initial-variables.xml'));
            cxt = snap2js.newContext();

            snap2js.compile(content)
                .then(_bin => bin = _bin)
                .nodeify(done);
        });

        it('should set list to 14', function(done) {
            cxt['bubble'] = value => {
                if (value === 14) done();
            };
            bin(cxt);
        });
    });

    describe('basic blocks', function() {
        before(function(){
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'variables.xml'));
        });

        describe('transpile', function() {
            var code;

            before(function(done) {
                snap2js.transpile(content)
                    .then(js => {
                        code = js;
                    })
                    .nodeify(done);
            });

            it('should contain "doSetVar"', function() {
                assert(/doSetVar.call\([^'"]/.test(code));
            });

            it('should contain "doChangeVar"', function() {
                assert(/doChangeVar.call\([^'"]/.test(code));
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

            it('should set a to 12', function(done) {
                cxt['doSetVar'] = (name, v) => {
                    if (name === 'a' && v === '14') done();
                };
                bin(cxt);
            });
        });
    });
});
