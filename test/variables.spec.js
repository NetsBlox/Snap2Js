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
            cxt['bubble'] = value => values.push(value);
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

    describe('nested lists', function() {
        var result;

        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'nested-lists.xml'));
            var cxt = snap2js.newContext();
            var bin = snap2js.compile(content);
            cxt['doReport'] = val => result = val;
            bin(cxt);
        });

        it('should parse string value', function() {
            assert.equal(result[0], '1');
        });

        it('should parse nested list values', function() {
            assert.equal(result[1][0], '2');
            assert.equal(result[1][1], '3');
        });

        it('should parse nested x2 list values', function() {
            assert.equal(result[1][2][0], '4');
        });
    });

    describe('cons/cdr', function() {
        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'cons-cdr.xml'));
            var cxt = snap2js.newContext();
            var bin = snap2js.compile(content);
            cxt['doReport'] = val => result = val;
            bin(cxt);
        });

        it('should parse cdr', function() {
            assert.equal(result[0], '5');
            assert.equal(result[1], '6');
            assert.equal(result[2], '7');
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
