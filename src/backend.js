// Generating the js code from the ast nodes (indexed by node type)
const indent = require('./indent');
var backend = {};

var callFnWithArgs = function(fn) {
    var inputs = Array.prototype.slice.call(arguments, 1);
    if (inputs.length) {
        return `__ENV.${fn}.call(self, ${inputs.join(', ')}, __CONTEXT)`;
    }
    return `__ENV.${fn}.call(self, __CONTEXT)`;
};

var callStatementWithArgs = function() {
    return callFnWithArgs.apply(null, arguments) + ';';
};

///////////////////// Motion ///////////////////// 

backend.turnRight =
backend.turnLeft =
backend.setXPosition =
backend.setYPosition =
backend.changeXPosition =
backend.changeYPosition =
backend.forward = function(node) {
    var dist = this.generateCode(node.inputs[0][0]);
    return callStatementWithArgs(node.type, `+${dist}`);
};

backend.xPosition =
backend.direction =
backend.yPosition = function(node) {
    return callFnWithArgs(node.type);
};

///////////////////// Control ///////////////////// 
backend.doWarp = function(node) {
    var body = this.generateCode(node.inputs[0][0]);
    return [
        callStatementWithArgs(node.type, true),
        body,
        callStatementWithArgs(node.type, false)
    ].join('\n');

};

backend.doWait = function(node) {
    var time = this.generateCode(node.inputs[0][0]),
        afterFn = `afterWait_${node.id}`,
        body = node.next ? this.generateCode(node.next) : '';

    return [
        `function ${afterFn} () {`,
        indent(body),
        `}`,
        callStatementWithArgs(node.type, time, afterFn)
    ].join('\n');
};
backend.doWait.async = true;

backend.doIfElse = function(node) {
    var cond = this.generateCode(node.inputs[0][0]),
        ifTrue = this.generateCode(node.inputs[1][0]),
        ifFalse = this.generateCode(node.inputs[1][1]);

    return [
        `if (${cond}) {`,
        indent(ifTrue),
        `} else {`,
        indent(ifFalse),
        `}`
    ].join('\n');
};

backend.doRepeat = function(node) {
    var count = this.generateCode(node.inputs[0][0]),
        body = this.generateCode(node.inputs[1][0]),
        iterVar = node.id,
        recurse;

    recurse = callStatementWithArgs('doYield', `doLoop_${node.id}`, node.id);
    return [
        `function doLoop_${node.id} (${node.id}) {`,
        indent(body),
        `if (--${node.id} > 0) {`,
        indent(recurse),
        `} else {`,
        indent(node.next ? this.generateCode(node.next) : ''),
        `}`,
        `}`,
         `doLoop_${node.id}(+${count});`
    ].join('\n');
};
backend.doRepeat.async = true;

backend.doReport = function(node) {
    var value = this.generateCode(node.inputs[0][0]);
    return 'return ' + callStatementWithArgs(node.type, value);
};


///////////////////// Looks ///////////////////// 
backend.getScale = function(node) {
    return callFnWithArgs(node.type);
};

backend.doSayFor = function(node) {
    var time = '+' + this.generateCode(node.inputs[0][1]),
        msg = this.generateCode(node.inputs[0][0]),
        afterFn = `afterSay_${node.id}`,
        body = node.next ? this.generateCode(node.next) : '';

    return [
        `function ${afterFn} () {`,
        indent(body),
        `}`,
        callStatementWithArgs(node.type, msg, time, afterFn)
    ].join('\n');
};
backend.doSayFor.async = true;

backend.doThinkFor = function(node) {
    var time = '+' + this.generateCode(node.inputs[0][1]),
        msg = this.generateCode(node.inputs[0][0]),
        afterFn = `afterThink_${node.id}`,
        body = node.next ? this.generateCode(node.next) : '';

    return [
        `function ${afterFn} () {`,
        indent(body),
        `}`,
        callStatementWithArgs(node.type, msg, time, afterFn)
    ].join('\n');
};
backend.doThinkFor.async = true;

backend.bubble = function(node) {
    var inputs;

    inputs = this.generateCode(node.inputs[0][0]);
    return callStatementWithArgs(node.type, inputs);
};

backend.doThink = function(node) {
    var msg = this.generateCode(node.inputs[0][0]);
    return callStatementWithArgs(node.type, msg);
};

///////////////////// Operators ///////////////////// 
backend.reportEquals = function(node) {
    var left = this.generateCode(node.inputs[0][0]),
        right = this.generateCode(node.inputs[1][0]);

    return callFnWithArgs(node.type, left, right);
};

backend.reportJoinWords = function(node) {
    var listInput = node.inputs[0][0],
        inputs = listInput.inputs[0].map(this.generateCode);

    return `[${inputs.join(',')}].join('')`;
};

///////////////////// Variables ///////////////////// 
backend.doChangeVar =
backend.doSetVar = function(node) {
    var name = this.generateCode(node.inputs[0][0]);
    var value = this.generateCode(node.inputs[0][1] || node.inputs[1][0]) || null;

    return callStatementWithArgs(node.type, name, value);
};

backend.doShowVar =
backend.doHideVar = function(node) {
    var name = this.generateCode(node.inputs[0][0]);

    return callStatementWithArgs(node.type, name);
};

backend.doDeclareVariables = function(node) {
    var names = node.inputs[0][0].inputs[0]
        .map(input => this.generateCode(input));

    return callStatementWithArgs(node.type, names.join(', '));
};

backend.doAddToList = function(node) {
    var value = this.generateCode(node.inputs[0][0]),
        rawList = node.inputs[1][0],
        list = null;

    if (rawList && rawList.type === 'variable') {
        list = `'${rawList.value}'`;
    }
    return callStatementWithArgs(node.type, value, list);
};

backend.reportListLength = function(node) {
    var variable = null;

    if (node.inputs[0][0] && node.inputs[0][0].type === 'variable') {
        variable = node.inputs[0][0].value;
    }

    return callFnWithArgs(node.type, `'${variable}'`);
};

backend.reportListItem = function(node) {
    var index = this.generateCode(node.inputs[0][0]),
        list = this.generateCode(node.inputs[1][0]);

    return callFnWithArgs(node.type, index, list);
};

backend.reportCDR = function(node) {
    var list = this.generateCode(node.inputs[0][0]);
    return callFnWithArgs(node.type, list);
};

backend.reportNewList = function(node) {
    var items = node.inputs[0].map(this.generateCode),
        args = [node.type].concat(items);

    return callFnWithArgs.apply(null, args);
};

backend.reportListContainsItem = function(node) {
    var list = this.generateCode(node.inputs[0][0]);
    var item = this.generateCode(node.inputs[1][0]);
    return callFnWithArgs(node.type, list, item);
};

backend.doDeleteFromList = function(node) {
    var list = this.generateCode(node.inputs[1][0]);
    var index = this.generateCode(node.inputs[0][0]);
    return callStatementWithArgs(node.type, index, list);
};

backend.doReplaceInList = function(node) {
    var index = this.generateCode(node.inputs[0][0]);
    var item = this.generateCode(node.inputs[0][1]);
    var list = this.generateCode(node.inputs[1][0]);

    return callStatementWithArgs(node.type, index, list, item);
};

backend.doInsertInList = function(node) {
    var value = this.generateCode(node.inputs[0][0]);
    var index = this.generateCode(node.inputs[0][1]);
    var rawList = node.inputs[1][0];
    var listName = null;

    if (rawList && rawList.type === 'variable') {
        listName = `'${rawList.value}'`;
    }

    return callStatementWithArgs(node.type, value, index, listName);
};

backend.variable = function(node) {
    return callFnWithArgs(node.type, `'${node.value}'`);
};

///////////////////// Primitives ///////////////////// 
backend.string = function(node) {
    return `'${node.value.replace(/'/g, "\\'")}'`;
};

backend.option = function(node) {
    return this.generateCode(node.inputs[0][0]);
};

backend.bool = function(node) {
    var content = node.inputs[0][0],
        value = 'false';

    if (content && content.value === 'true') {
        value = content.value;
    }

    return value;
};

module.exports = backend;
