const parseSpec = function (spec) {
    var parts = [], word = '', i, quoted = false, c;
    for (i = 0; i < spec.length; i += 1) {
        c = spec[i];
        if (c === "'") {
            quoted = !quoted;
        } else if (c === ' ' && !quoted) {
            parts.push(word);
            word = '';
        } else {
            word = word.concat(c);
        }
    }
    parts.push(word);
    return parts;
};
const inputNames = function (spec) {
    var vNames = [],
        parts = parseSpec(spec);

    parts.forEach(function (part) {
        if (part[0] === '%' && part.length > 1) {
            vNames.push(part.slice(1));
        }
    });
    return vNames;
};

const indent = lines => '  ' + lines.replace(/\n/g, '  ');
const clone = obj => {
    var newObj = {},
        keys = Object.keys(obj);

    for (var i = keys.length; i--;) {
        newObj[keys[i]] = obj[keys[i]];
    }
    return newObj;
};

const sanitize = function(text) {
    if (typeof text === 'string') {
        return `unescape('${escape(text)}')`;
    } else if (text instanceof Array){
        return '[' + text.map(val => sanitize(val)).join(',') + ']';
    }
    return text;
};

const defer = function () {
    const deferred = {resolve: null, reject: null};
    deferred.promise = new Promise((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
    });
    return deferred;
};

module.exports = {
    indent: indent,
    clone: clone,
    parseSpec: parseSpec,
    inputNames: inputNames,
    sanitize,
    defer,
};
