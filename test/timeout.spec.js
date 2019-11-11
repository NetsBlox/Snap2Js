describe('callMaybeAsync', function() {
    const utils = require('./utils');
    const assert = require('assert');
    const snap2js = require('..');

    const context = snap2js.newContext();
    const TIMEOUT = 50;
    let lastMsg = null;

    context.bubble = res => {
        lastMsg = res;
    };
    context.__start = function(project) {
        project.startTime = Date.now();
    };

    context.doYield = function() {
        // Wait for any args to resolve
        if (Date.now() > (this.project.startTime + TIMEOUT)) {
            throw new Error('Timeout Exceeded');
        }
    };

    [
        'forever-timeout',
        'warp-forever-timeout',
        'repeat-timeout',
        'repeat-until-timeout',
    ].forEach(filename => {
        describe(filename, function() {
            it('should return the timeout error', async function() {
                const content = utils.getContextXml(filename);
                const fn = snap2js.compile(content, {allowWarp: false})(context);
                try {
                    await fn();
                } catch (err) {
                    assert(err.message.includes('Timeout Exceeded'), err.message);
                }
            });
        });
    });
});
