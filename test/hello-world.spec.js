describe.only('hello world', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'hello-world.xml'));
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

        it('should generate js code', function() {
            assert(code);
        });

        it('should contain "bubble" block selector (fn)', function() {
            assert(code.includes('bubble'));
        });

    });

    it('should call "bubble" with "Hello world!"', function(done) {
        snap2js.compile(content)
            .then(bin => {
                var cxt = snap2js.newContext();
                cxt['bubble'] = function(str) {
                    assert.equal(str, 'Hello world!');
                    done();
                };
                bin(cxt);
            });
    });
});
