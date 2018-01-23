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
    return `unescape('${escape(text)}')`;
};

module.exports = {
    indent: indent,
    clone: clone,
    parseSpec: parseSpec,
    inputNames: inputNames,
    sanitize
};
