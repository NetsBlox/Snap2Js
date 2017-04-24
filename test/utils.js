const snap2js = require('..');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const TEST_CASE_DIR = path.join(__dirname, 'test-cases');

// Helpers
function isRightAfter(list, a, b) {
    var i = list.indexOf(a);
    return list[i+1] === b;
}

function isRightBefore(list, a, b) {
    var i = list.indexOf(b);
    return list[i-1] === a;
}

function checkBlockValue(bin, fn, val, done) {
    var cxt = snap2js.newContext('nop');
    cxt[fn] = arg => {
        assert.equal(arg, val);
        done();
    };
    bin(cxt);
}

function getCompiledVersionOf(projectName) {
    var content = fs.readFileSync(path.join(TEST_CASE_DIR, projectName + '.xml'));
    return snap2js.compile(content);
}

function compileAndRun(projectName) {
    let content = fs.readFileSync(path.join(TEST_CASE_DIR, projectName + '.xml'));
    let cxt = snap2js.newContext();
    let result;

    cxt['doReport'] = val => result = val;
    bin = getCompiledVersionOf(projectName);
    bin(cxt);
    return result;
}

module.exports = {
    isRightAfter,
    isRightBefore,
    getCompiledVersionOf,
    compileAndRun,
    checkBlockValue
};
