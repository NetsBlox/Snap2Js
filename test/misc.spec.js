describe('misc', function() {
    let snap2js = require('..'),
        assert = require('assert'),
        utils = require('./utils');

    it('should reference "project" from the stage', function(done) {
        const content = utils.getProjectXml('change-x-10x');
        const fn = snap2js.compile(content);

        const env = snap2js.newContext();
        env.__start = project => {
            const stage = project.stage;
            assert.equal(stage.project, project);
            done();
        };
        fn(env)
    });

    it('should compile w/ empty receiver elements', function() {
        const content = utils.getContextXml('empty-receiver');
        const fn = snap2js.compile(content);
    });

    it('should hoist sprite declaration before stage logic', function() {
        const queryXml = utils.getContextXml('hoist-sprite');
        const factory = snap2js.compile(queryXml);
        const env = snap2js.newContext();
		const fn = factory(env);  // throws an error if undefined sprites
    });

    it('should ignore comments', function() {
        const content = utils.getProjectXml('comments');
        const fn = snap2js.compile(content);
        const env = snap2js.newContext();
        fn(env);
    });

    it('should get random numbers', async function() {
        const queryXml = utils.getContextXml('get-random-numbers');
        const factory = snap2js.compile(queryXml);
        const env = snap2js.newContext();
		const fn = factory(env);
        const randoms = await fn([1,2]);
        assert.equal(randoms.length, 2);
    });
});
