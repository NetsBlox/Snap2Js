describe('hello (joined) world', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = utils.getProjectXml('hello-joined-world');
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "bubble" block selector w/ nested fn', function() {
            assert(/\bbubble\b/.test(code));
        });

    });

    it('should call "bubble" with "Hello world!"', function(done) {
        var cxt = snap2js.newContext();

        bin = snap2js.compile(content);
        cxt['bubble'] = function(str) {
            assert.equal(str, 'hello world!');
            done();
        };
        bin(cxt);
    });
});
