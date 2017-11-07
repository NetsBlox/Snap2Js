// Test that we can compile functions from snap into callable JS functions
describe('functions', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const env = require('../src/context/basic');
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
    }

    utils.getContextNames().forEach((name, i) => {
        describe(name, () => {
            let content = null;

            before(() => content = utils.getContextXml(name))

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
                it(`should return fn where ${input}->${output}`, function() {
                    let fn = snap2js.compile(content);
                    if (input) {
                        assert.equal(fn(env).apply(null, input), output);
                    } else {
                        assert.equal(fn(env)(), output);
                    }
                });
            }
        });
    });
});
