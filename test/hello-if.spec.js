describe.only('hello if-else', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        content;

    before(function(){
        content = fs.readFileSync(path.join(TEST_CASE_DIR, 'if-statement.xml'));
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

        it('should contain "bubble" block selector w/ nested fn', function() {
            console.log('code', code);
            assert(/bubble\([^'"]/.test(code));
        });

    });

    it('should call "bubble" with "Hello world!"', function(done) {
        snap2js.compile(content)
            .then(bin => {
                var cxt = snap2js.newContext();
                cxt['bubble'] = function(str) {
                    assert.equal(str, 'hello world!');
                    done();
                };
                bin(cxt);
            })
            .fail(err => done(err));
    });
});
