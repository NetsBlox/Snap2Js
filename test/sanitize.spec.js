describe('sanitize', function() {
    const utils = require('./utils');
    const snap2jsUtils = require('../src/utils');
    const snap2js = require('..');
    const assert = require('assert');

    it('should compile with custom blocks containing `', function(done) {
        const content = utils.getContextXml('back-tick-var');
        const context = snap2js.newContext();

        const fn = snap2js.compile(content)(context);
        fn().then(() => done()).catch(done);
    });

    it('should compile with invalid var,sprite names, values', function() {
        const content = utils.getProjectXml('sanitize-inputs');
        const context = snap2js.newContext();

        const fn = snap2js.compile(content);
        fn(context);
    });

    it('should be able to sanitize arrays', function() {
        const original = ['hey', '-world'];
        const safeList = snap2jsUtils.sanitize(original);
        const list = eval(safeList);
        assert.deepEqual(list, original);
    });
});
