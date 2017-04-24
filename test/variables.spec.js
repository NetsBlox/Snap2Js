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

        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'initial-variables.xml'));
            cxt = snap2js.newContext();

            values = [];
            cxt['bubble'] = variable => values.push(variable.value);
            bin = snap2js.compile(content);
            bin(cxt);
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

            before(function() {
                code = snap2js.transpile(content);
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

            before(function() {
                cxt = snap2js.newContext();
                cxt['setXPosition'] = v => xVal = v;
                cxt['changeXPosition'] = v => xVal += v;

                bin = snap2js.compile(content);
            });

            it('should set a to 12', function(done) {
                cxt['doSetVar'] = (name, v) => {
                    if (name === 'a' && v === '14') done();
                };
                bin(cxt);
            });
        });
    });

    describe.skip('nested lists', function() {
        var result;

        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'nested-lists.xml'));
            var bin = snap2js.compile(content);
            cxt['doReport'] = val => result = val;
            bin(cxt);
        });

        it('should correctly parse the nested lists', function(done) {
            console.log(result);
        });
    });

    describe.skip('all blocks', function() {
        var result,
            cxt;

        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'all-variables.xml'));
            var bin = snap2js.compile(content)
            cxt = snap2js.newContext();
            cxt['doReport'] = val => result = val;
            bin(cxt);
        });

        it('should change hue by 10', function(done) {
            console.log(result);
        });
    });
});
