// Test that we can compile functions from snap into callable JS functions
// TODO
describe.only('functions', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const path = require('path');
    const utils = require('./utils');

    // Create a test for each of the test cases that we have
    utils.getContextNames().forEach((name, i) => {
        if (name === 'simple-fn')
        it(`should be able to compile ${name}`, function() {
            let content = utils.getContextXml(name);
            code = snap2js.transpile(content);
            console.log(code);
        });
    });
});
