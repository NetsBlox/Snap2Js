describe('custom blocks', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');

    describe('sum numbers', function() {
        before(function(done) {
            utils.compileAndRun('custom-block')
                .then(res => result = res)
                .nodeify(done);
        });

        it('should evaluate custom block correctly', function() {
            assert.equal(result, 7);
        });

    });

    describe('all inputs', function() {
        before(function(done) {
            utils.compileAndRun('custom-block-inputs')
                .then(res => result = res)
                .nodeify(done);
        });

        [
            ['boolean', true],
            ['list', ['1', '2']],
            ['number', 3],
            ['cmd ring', val => typeof val === 'function'],
            ['reporter ring', val => val(3) === 4],
            ['predicate ring', val => val(false) === true],
            ['cslot', val => typeof val === 'function'],
            ['any input', 'asdf'],
            ['boolUE', false],
            ['year', val => val === new Date().getFullYear()]
        ].forEach((pair, index) => {
            let [type, value] = pair;

            it(`should evaluate ${type}`, function() {
                if (value instanceof Array) {
                    value.forEach((el, i) => {
                        assert.equal(result[index][i], el);
                    });
                } else if (value instanceof Function) {
                    assert(value(result[index]));
                } else {
                    assert.equal(result[index], value);
                }
            });
        });

        describe('complex cases', function() {
            var bin;

            before(function() {
                bin = utils.getCompiledVersionOf('custom-block-inputs');
            });

            it('should invoke "forward" in first anon fn', function(done) {
                var cxt = snap2js.newContext(),
                    fn;

                cxt['forward'] = dist => {
                    assert.equal(dist, 13);
                    done();
                };

                cxt['doReport'] = r => result = r;
                bin(cxt);
                fn = result[3];
                fn(13);
            });

            it('should wrap cslot in fn', function(done) {
                var cxt = snap2js.newContext(),
                    result,
                    fn;

                cxt['bubble'] = msg => {
                    assert.equal(msg, 'Hello!');
                    done();
                };

                cxt['doReport'] = r => result = r;
                bin(cxt);
                fn = result[6];
                fn();
            });

            it('should get "stage"', function(done) {
                var cxt = snap2js.newContext(),
                    result,
                    fn;

                cxt['doReport'] = () => {};
                cxt['reportGet'] = thing => {
                    assert.equal(thing, 'stage');
                    done();
                };

                bin(cxt);
            });
        });

        describe('cslot', function() {
            before(function() {
                bin = utils.getCompiledVersionOf('custom-block-cslot');
            });

            it('should move 5 times', function(done) {
                var cxt = snap2js.newContext(),
                    count = 0;

                cxt['forward'] = () => {
                    count++;
                    if (count === 5) done();
                };
                bin(cxt);
            });
        });

    });

    describe('local sum numbers', function() {
        describe('sprite', function() {
            before(function(done) {
                utils.compileAndRun('local-custom-sum')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 11);
            });
        });

        describe('stage', function() {
            before(function(done) {
                utils.compileAndRun('stage-custom-sum')
                    .then(res => result = res)
                    .nodeify(done);
            });

            it('should evaluate custom block correctly', function() {
                assert.equal(result, 6);
            });
        });
    });

});
