describe('sounds', function() {
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
            content = fs.readFileSync(path.join(TEST_CASE_DIR, 'all-sounds.xml'));
            bin = snap2js.compile(content);
        });

        it('should play "cat" sound', function(done) {
            checkBlockValue(bin, 'playSound', 'Cat', done);
        });

        it('should play "cat" sound until done', function(done) {
            checkBlockValue(bin, 'doPlaySoundUntilDone', 'Cat', done);
        });

        it('should rest for 0.2 beats', function(done) {
            checkBlockValue(bin, 'doRest', 0.2, done);
        });

        it('should play 60 for 0.5 beats', function(done) {
            cxt = snap2js.newContext('nop');
            cxt['doPlayNote'] = (note, duration) => {
                assert.equal(note, 60);
                assert.equal(duration, 0.5);
                done();
            };
            bin(cxt);
        });

        it('should set tempo to 60', function(done) {
            checkBlockValue(bin, 'doSetTempo', 60, done);
        });

        it('should change tempo by 20', function(done) {
            checkBlockValue(bin, 'doChangeTempo', 20, done);
        });

        it('should have a tempo of 80', function(done) {
            cxt = snap2js.newContext();
            cxt['doReport'] = tempo => {
                assert.equal(tempo, 80);
                done();
            };
            bin(cxt);
        });

    });
});

