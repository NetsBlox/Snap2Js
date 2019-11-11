describe('change x 10x', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils'),
        content;

    before(function(){
        content = utils.getProjectXml('change-x-10x');
    });

    describe('transpile', function() {
        var code;

        before(function() {
            code = snap2js.transpile(content);
        });

        it('should contain "setXPosition"', function() {
            assert(/\bsetXPosition\b/.test(code));
        });
    });

    describe('compile', function() {
        var bin,
            cxt,
            xVal = 0;

        before(function() {
            cxt = snap2js.newContext();
            cxt['setXPosition'] = v => xVal = (+v);

            bin = snap2js.compile(content);
        });

        it('should finish with x == 100', function(done) {
            cxt['changeXPosition'] = v => {
                xVal += +v;
                if (xVal === 100) done();
            };
            bin(cxt);
        });
    });
});
