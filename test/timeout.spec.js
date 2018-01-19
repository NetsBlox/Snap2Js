describe('callMaybeAsync', function() {
    const utils = require('./utils');
    const snap2js = require('..');

    const context = snap2js.newContext();
    const TIMEOUT = 50;
    let lastMsg = null;

    context.bubble = res => {
        lastMsg = res;
    };
    context.__start = function(project) {
        console.log('START');
        project.startTime = Date.now();
    };

    context.callMaybeAsync = function(self, fn) {
        let args = [].slice.call(arguments, 2);

        // Wait for any args to resolve
        if (Date.now() > (self.project.startTime + TIMEOUT)) {
            console.log('timeout');
            return context.SPromise.reject(new Error('Timeout Exceeded'));
        }

        let result = context.SPromise.all(args);

        result = result.then(args => fn.apply(self, args));

        return result;
    };

    [
        'forever-timeout',
        'warp-forever-timeout',
        'repeat-timeout',
        'repeat-until-timeout',
    ].forEach(filename => {
        describe(filename, function() {
            it('should be able to override callMaybeAsync', function(done) {
                const content = utils.getProjectXml(filename);
                const fn = snap2js.compile(content)
                fn(context);
                setTimeout(() => {
                    const finalValue = lastMsg;
                    setTimeout(() => {
                        if (finalValue === lastMsg) {
                            done();
                        } else {
                            done(`Script still executing! Expected ${finalValue} but got ${lastMsg}`);
                        }
                    }, 25);
                }, 51);
            });

            it('should return the timeout error', function(done) {
                const content = utils.getContextXml(filename);
                const fn = snap2js.compile(content)(context);
                fn()
                    .then(() => done('Expected error...'))
                    .catch(err => done());
            });
        });
    });
});
