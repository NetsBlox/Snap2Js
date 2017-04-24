describe('hello (joined) world', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'hello-joined-world.xml'));
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "bubble" block selector w/ nested fn', function() {
            console.log('code', code);
            assert(/bubble.call\([^'"]/.test(code));
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
