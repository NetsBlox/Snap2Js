// Test that we can compile functions from snap into callable JS functions
describe('functions', function() {
    const _ = require('lodash');
    const snap2js = require('..');
    const assert = require('assert');
    const env = snap2js.newContext();
    const path = require('path');
    const utils = require('./utils');

    // Create a test for each of the test cases that we have
    const INPUT_OUTPUTS = {};
    INPUT_OUTPUTS['args-local-recursive'] =
    INPUT_OUTPUTS['args-global-recursive'] = {
        input: [6],
        output: 720
    };
    INPUT_OUTPUTS['local-recursive'] =
    INPUT_OUTPUTS['global-recursive'] = {
        output: 120
    };
    INPUT_OUTPUTS['fib'] = {
        output: 1
    };
    INPUT_OUTPUTS['args-local-custom'] =
    INPUT_OUTPUTS['args-global-custom'] =
    INPUT_OUTPUTS['global-custom'] =
    INPUT_OUTPUTS['local-custom'] =
    INPUT_OUTPUTS['simple-fn'] = {
        output: 'szia világ'
    };
    INPUT_OUTPUTS['args-simple-fn'] = {
        input: ['TEST '],
        output: 'TEST világ'
    };

    utils.getContextNames().forEach((name, i) => {
        describe(name, () => {
            let content = null;

            before(() => content = utils.getContextXml(name));

            it(`should be able to compile code`, function() {
                let code = snap2js.transpile(content);
            });

            it(`should create a js function`, function() {
                let fn = snap2js.compile(content);
                assert.equal(typeof fn, 'function');
            });

            it(`should return a callable js fn`, function() {
                let fn = snap2js.compile(content);
                assert.equal(typeof fn(env), 'function');
            });

            if (INPUT_OUTPUTS[name]) {
                let input = INPUT_OUTPUTS[name].input;
                let output = INPUT_OUTPUTS[name].output;
                it(`should return fn where ${input || '()'}->${output}`, async function() {
                    const factory = snap2js.compile(content);
                    const fn = factory(env);
                    if (input) {
                        assert.equal(await fn.apply(null, input), output);
                    } else {
                        assert.equal(await fn(), output);
                    }
                });
            }
        });
    });

    describe('anon statement fn', () => {
        before(() => content = utils.getContextXml('build-list'));

        it(`should return list 1-100`, async function() {
            let factory = snap2js.compile(content);
            let env = snap2js.newContext();
            let fn = factory(env);
            const result = await fn();
            result.forEach((n, i) => assert.equal(n, i+1));
        });
    });

    describe('implicit arguments', () => {
        it('should default to empty slots as inputs', async function() {
            const result = await utils.compileAndRun('implicit-inputs');
            assert.equal(result, 9);
        });

        it('should not treat empty slots as inputs if specified', async function() {
            const result = await utils.compileAndRun('fake-implicit-inputs');
            assert.equal(result, 1);
        });
    });

    describe.skip('closures', () => {
        before(() => content = utils.getContextXml('fib'))

        it(`should maintain project state between calls`, function() {
            let fn = snap2js.compile(content);
            let cxt = snap2js.newContext();
            let fib = fn(cxt);
            let results = [1, 2, 3, 5, 8, 13];
            results.forEach(num => assert.equal(num, fib()));
        });

        // This is more of a problem with the snap serialization...
        it(`should capture global variables w/ primitive fns`, function() {
            content = utils.getContextXml('hello-world');
            let factory = snap2js.compile(content);
            let cxt = snap2js.newContext();
            let hello = factory(cxt);
            assert.equal(hello(), 'I am running on the server');
        });

        //  It should capture the variables in the scope...
        it(`should retrieve script variables`, function() {
            // TODO
        });
    });
});
