const snap2js = require('..');
const assert = require('assert');
const fs = require('fs');
const Q = require('q');
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
    var content = getProjectXml(projectName);
    return snap2js.compile(content);
}

function compileAndRun(projectName) {
    let deferred = Q.defer();
    let content = getProjectXml(projectName);
    let cxt = snap2js.newContext();

    cxt['doReport'] = val => deferred.resolve(val);
    bin = getCompiledVersionOf(projectName);
    bin(cxt);
    return deferred.promise;
}

function getProjectPaths() {
    return fs.readdirSync(path.join(TEST_CASE_DIR, 'projects'))
        .map(name => path.join(TEST_CASE_DIR, 'projects', name));
}

function getContextNames() {
    return fs.readdirSync(path.join(TEST_CASE_DIR, 'contexts'))
        .map(name => name.replace(/\.xml$/, ''));
}

function getProjectXml(projectName) {
    return fs.readFileSync(path.join(TEST_CASE_DIR, 'projects', projectName + '.xml'));
}

function getContextXml(name) {
    return fs.readFileSync(path.join(TEST_CASE_DIR, 'contexts', name + '.xml'));
}

module.exports = {
    isRightAfter,
    isRightBefore,
    getCompiledVersionOf,
    compileAndRun,
    checkBlockValue,

    getProjectXml,
    getProjectPaths,
    getContextXml,
    getContextNames
};
