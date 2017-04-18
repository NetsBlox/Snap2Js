describe('variables', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    describe('initial values', function() {
        var bin,
            cxt,
            values;

        before(function(done) {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'initial-variables.xml'));
            cxt = snap2js.newContext();

            values = [];
            cxt['bubble'] = variable => values.push(variable.value);
            snap2js.compile(content)
                .then(bin => {
                    bin(cxt);
                })
                .nodeify(done);
        });

        it('should first say 14', function() {
            assert.equal(values[0], 14);
        });

        it('should second say list 1,2,3', function() {
            assert.equal(values[1][0], 1);
            assert.equal(values[1][1], 2);
            assert.equal(values[1][2], 3);
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
