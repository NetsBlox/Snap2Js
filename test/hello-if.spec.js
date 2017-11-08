describe('hello if-else', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = utils.getProjectXml('if-statement');
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "bubble" block selector w/ nested fn', function() {
            assert(/bubble.call\([^'"]/.test(code));
        });

    });

    describe('compile', function() {
        var bin;

        before(function() {
            bin = snap2js.compile(content);
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
