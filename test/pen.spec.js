describe('pen', function() {
    let fs = require('fs'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases'),
        snap2js = require('..'),
        assert = require('assert'),
        checkBlockValue = require('./utils').checkBlockValue,
        content;

    describe('all blocks', function() {
        var bin,
            cxt;

        before(function() {
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'all-pen.xml'));
            bin = snap2js.compile(content);
        });

        it('should set pen color to reddish', function(done) {
            checkBlockValue(bin, 'setColor', '145,26,68,1', done);
        });

        it('should change hue by 10', function(done) {
            checkBlockValue(bin, 'changeHue', 10, done);
        });

        it('should set hue to 0', function(done) {
            checkBlockValue(bin, 'setHue', 0, done);
        });

        it('should set brightness to 100', function(done) {
            checkBlockValue(bin, 'setBrightness', 100, done);
        });

        it('should change brightness by 10', function(done) {
            checkBlockValue(bin, 'changeBrightness', 10, done);
        });

        it('should change size by 1', function(done) {
            checkBlockValue(bin, 'changeSize', 1, done);
        });

        it('should set size to 1', function(done) {
            checkBlockValue(bin, 'setSize', 1, done);
        });

    });

});

