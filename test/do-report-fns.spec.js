describe('doReport', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const utils = require('./utils');
    const env = snap2js.newContext();

    it('should return the result of reifyReporter', () => {
        let content = utils.getProjectXml('do-report-simple');
        let fn = snap2js.compile(content);

        // Run the script and check the value of 'result' (should be true)
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };

        fn(env);
    });

    it('should return the result in reifyScript', done => {
        let content = utils.getProjectXml('do-report-reify-script');
        let fn = snap2js.compile(content);

        // Run the script and check the value of 'result' (should be true)
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };

        fn(env);
    });

    it('should return the result in (async) reifyScript', done => {
        let content = utils.getProjectXml('do-report-reify-script-async');
        let fn = snap2js.compile(content);
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };
        fn(env);
    });

    it('should ignore the doReport in custom command blocks', () => {
        let content = utils.getProjectXml('do-report-nop');
        let fn = snap2js.compile(content);

        // Run the script and check the value of 'result' (should be true)
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };

        fn(env);
    });

    it('should return result in custom reporter blocks', done => {
        let content = utils.getProjectXml('do-report-custom-reporter');
        let fn = snap2js.compile(content);

        // Run the script and check the value of 'result' (should be true)
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };

        fn(env);
    });

    it('should return result in custom predicate blocks', done => {
        let content = utils.getProjectXml('do-report-anon-pred');
        let fn = snap2js.compile(content);

        // Run the script and check the value of 'result' (should be true)
        env.bubble = result => {
            assert.equal(result, true);
            done();
        };

        fn(env);
    });

});
