

// Helpers
function isRightAfter(list, a, b) {
    var i = list.indexOf(a);
    return list[i+1] === b;
}

function isRightBefore(list, a, b) {
    var i = list.indexOf(b);
    return list[i-1] === a;
}

module.exports = {
    isRightAfter,
    isRightBefore
};
