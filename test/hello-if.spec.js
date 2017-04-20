describe('hello if-else', function() {
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
            assert(/bubble.call\([^'"]/.test(code));
        });

    });

    describe('compile', function() {
        var bin;

        before(function(done) {
            snap2js.compile(content)
                .then(_bin => bin = _bin)
                .nodeify(done);
        });

        it('should call "bubble" if "getScale" != 50', function(done) {
            var cxt = snap2js.newContext();
            cxt['getScale'] = () => 49;
            cxt['bubble'] = function(str) {
                assert.equal(str, 'hello world!');
                done();
            };
            bin(cxt);
        });

        it('should call "doSayFor" if "getScale" == 50', function(done) {
            var cxt = snap2js.newContext(),
                said = false;

            cxt['getScale'] = () => 50;
            cxt['bubble'] = function(str) {
                assert(false);
            };
            cxt['doSayFor'] = function(str, time, after) {
                assert.equal(time, 2);
                assert.equal(str, 'I am small');
                said = true;
                after();
            };
            cxt['forward'] = function(d) {
                assert.equal(d, 10);
                assert(said);
                done();
            };
            bin(cxt);
        });
    });
});
