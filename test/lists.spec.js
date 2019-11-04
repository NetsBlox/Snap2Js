describe('lists', function() {
    let snap2js = require('..'),
        utils = require('./utils'),
        assert = require('assert'),
        content;

    before(function(){
        content = utils.getProjectXml('lists');
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "reportListLength"', function() {
            assert(/\breportListLength\b/.test(code));
        });

        it('should contain doAddToList', function() {
            assert(/\bdoAddToList\b/.test(code));
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

    describe('references', function() {
        it('should support self-referencing', async function() {
            content = utils.getContextXml('recursive-data');
            const bin = snap2js.compile(content)
            cxt = snap2js.newContext();
            fn = bin(cxt);
            const res = await fn();
            assert.equal(res, 4);
        });
    });
});
