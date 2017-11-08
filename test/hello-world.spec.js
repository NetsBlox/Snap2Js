describe('hello world', function() {
    let snap2js = require('..'),
        utils = require('./utils'),
        assert = require('assert'),
        content;

    before(function(){
        content = utils.getProjectXml('hello-world');
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should generate js code', function() {
            assert(code);
        });

        it('should contain "bubble" block selector (fn)', function() {
            assert(code.includes('bubble'));
        });

    });

    it('should call "bubble" with "Hello world!"', function(done) {
        var cxt = snap2js.newContext();
        var bin = snap2js.compile(content);
        cxt['bubble'] = function(str) {
            assert.equal(str, 'Hello world!');
            done();
        };
        bin(cxt);
    });
});
