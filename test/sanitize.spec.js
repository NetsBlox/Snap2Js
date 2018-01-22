describe.only('sanitize', function() {
    const utils = require('./utils');
    const snap2js = require('..');

    it('should compile with custom blocks containing `', function(done) {
        const content = utils.getContextXml('back-tick-var');
        const context = snap2js.newContext();

        const fn = snap2js.compile(content)(context);
        fn().then(() => done()).catch(done);
    });

    it('should compile with invalid var,sprite names, values', function(done) {
        const content = utils.getProjectXml('sanitize-inputs');
        const context = snap2js.newContext();

        const fn = snap2js.compile(content);
        fn(context);
    });
});
