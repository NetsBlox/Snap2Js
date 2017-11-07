// Test that we can compile functions from snap into callable JS functions
describe.only('functions', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const env = require('../src/context/basic');
    const path = require('path');
    const utils = require('./utils');

    // Create a test for each of the test cases that we have
    const INPUT_OUTPUTS = {};
    INPUT_OUTPUTS['local-custom'] =
    INPUT_OUTPUTS['simple-fn'] = {
        output: 'szia világ'
    };
    INPUT_OUTPUTS['args-simple-fn'] = {
        input: ['TEST '],
        output: 'TEST világ'
    }

    utils.getContextNames().forEach((name, i) => {
        if (name !== 'local-custom') return;

        describe(name, () => {
            let content = null;

            before(() => content = utils.getContextXml(name))

            it(`should be able to compile code`, function() {
                let code = snap2js.transpile(content);
                console.log(code);
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