describe('lists', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'lists.xml'));
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "reportListLength"', function() {
            assert(/reportListLength.call\([^'"]/.test(code));
        });

        it('should contain doAddToList', function() {
            assert(/doAddToList.call\([^'"]/.test(code));
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            vals = [];

        // check the 'doSayFor' blocks
        // TODO

        // should report length of 2
        // should report 'hello'
        // should report ['world']
        // should report true
        // should report true
        before(function() {
            cxt = snap2js.newContext();
            cxt['bubble'] = v => vals.push(v);

            bin = snap2js.compile(content);
            bin(cxt);
        });

        it('should report length of 2', function() {
            assert.equal(vals[0], 2)
        });
    });
});
