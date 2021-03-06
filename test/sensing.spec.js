describe('sensing', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const utils = require('./utils');
    let content;

    describe('all blocks', function() {
        var bin,
            cxt;

        before(function() {
            const content = utils.getProjectXml('all-sensing');
            bin = snap2js.compile(content);
        });

        it('should ask "what\'s your name?"', function(done) {
            cxt = snap2js.newContext();
            cxt['doAsk'] = msg => {
                assert.equal(msg, 'what\'s your name?');
                done();
            };
            bin(cxt);
        });

        it('should set turbo mode on', function(done) {
            checkBlockValue(bin, 'doSetFastTracking', true, done);
        });

        it('should check space key pressed', function(done) {
            checkBlockValue(bin, 'reportKeyPressed', 'space', done);
        });

        it('should get distance to mouse-pointer', function(done) {
            checkBlockValue(bin, 'reportDistanceTo', 'mouse-pointer', done);
        });

        it('should get direction of Sprite', function(done) {
            cxt = snap2js.newContext('nop');
            cxt['reportAttributeOf'] = (attr, obj) => {
                assert.equal(attr, 'direction');
                assert.equal(obj, 'Sprite');
                done();
            };
            bin(cxt);
        });

        it('should get neighbors', function(done) {
            checkBlockValue(bin, 'reportGet', 'neighbors', done);
        });

        it('should get snap url', function(done) {
            checkBlockValue(bin, 'reportURL', 'snap.berkeley.edu', done);
        });

        it('should get date', function(done) {
            checkBlockValue(bin, 'reportDate', 'date', done);
        });

        function checkBlockValue(bin, fn, val, done) {
            var cxt = snap2js.newContext('nop');
            cxt[fn] = arg => {
                assert.equal(arg, val);
                done();
            };
            bin(cxt);
        };

        it('should compile v6 blocks', function() {
            const content = utils.getProjectXml('all-sensingv2');
            snap2js.compile(content);
        });

    });

    describe('timer', function() {
        before(function() {
            content = utils.getProjectXml('timer');
        });

        it('should have a timer value of 0.1', function(done) {
            var cxt = snap2js.newContext();
            cxt['doReport'] = time => {
                console.log(time);
                assert(time <= 0.15);
                assert(time >= 0.05);
                done();
            };
            bin = snap2js.compile(content);
            bin(cxt);
        });

    });

    describe('date', function() {
        var result,
            startTime,
            endTime;

        before(function(done) {
            content = utils.getProjectXml('date');
            var cxt = snap2js.newContext();
            cxt['doReport'] = res => {
                result = res;
                console.log(result);
                endTime = new Date();
                done();
            };
            bin = snap2js.compile(content);
            startTime = new Date();
            bin(cxt);
        });

        it('should return the correct date', function() {
            checkDate(0, 'getDate');
        });

        it('should return the correct year', function() {
            checkDate(1, 'getFullYear');
        });

        it('should return the correct month', function() {
            checkDate(2, 'getMonth');
        });

        it('should return the correct day of week', function() {
            checkDate(3, 'getDay');
        });

        it('should return the correct hour', function() {
            checkDate(4, 'getHours');
        });

        it('should return the correct minutes', function() {
            checkDate(5, 'getMinutes');
        });

        it('should return the correct seconds', function() {
            checkDate(6, 'getSeconds');
        });

        it('should return the correct time', function() {
            checkDate(7, 'getTime');
        });

        function checkDate(index, fn) {
            assert(startTime[fn]() <= result[index],
                `expected ${startTime[fn]()} <= ${result[index]}`);
            assert(endTime[fn]() >= result[index],
                `expected ${startTime[fn]()} >= ${result[index]}`);
        }

    });
});

