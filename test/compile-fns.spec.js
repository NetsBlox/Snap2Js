// Test that we can compile functions from snap into callable JS functions
describe.only('functions', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const env = require('../src/context/basic');
    const path = require('path');
    const utils = require('./utils');

    // Create a test for each of the test cases that we have
    utils.getContextNames().forEach((name, i) => {
        if (name !== 'simple-fn') return;

        describe(name, () => {
            let content = null;

            before(() => content = utils.getContextXml(name))

            it(`should be able to compile code`, function() {
                code = snap2js.transpile(content);
            });

            it(`should create a js function`, function() {
                let fn = snap2js.compile(content);
                assert.equal(typeof fn, 'function');
            });

            it(`should return a callable js fn`, function() {
                let fn = snap2js.compile(content);
                console.log(fn.toString());
                assert.equal(typeof fn(env), 'function');
            });

            it(`should return a callable js fn which returns the correct value`, function() {
                let fn = snap2js.compile(content);
                assert.equal(typeof fn(env), 'szia világ');
            });
        });
    });
});
