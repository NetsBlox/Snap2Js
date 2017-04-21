const snap2js = require('..');
const assert = require('assert');

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

module.exports = {
    isRightAfter,
    isRightBefore,
    checkBlockValue
};
