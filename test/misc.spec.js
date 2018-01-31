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
});
