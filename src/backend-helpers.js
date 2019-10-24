const callRawFnWithArgs = function(fn) {
    const inputs = Array.prototype.slice.call(arguments, 1);
    if (inputs.length) {
        return `${fn}.call(self, ${inputs.join(', ')}, DEFAULT_CONTEXT)`;
    }
    return `${fn}.call(self, DEFAULT_CONTEXT)`;
};

const callFnWithArgs = function(fn) {
    arguments[0] = `__ENV.${fn}`;
    return callRawFnWithArgs.apply(null, arguments);
};

const callStatementWithArgs = function() {
    return callFnWithArgs.apply(null, arguments) + '\n';
};

const callRawStatementWithArgs = function() {
    return callRawFnWithArgs.apply(null, arguments) + '\n';
};

const newPromise = (value='') => `SPromise.resolve(${value})`;

module.exports = {
    callRawFnWithArgs,
    callFnWithArgs,
    callRawStatementWithArgs,
    callStatementWithArgs,
    newPromise,
};
