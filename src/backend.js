// Generating the js code from the ast nodes (indexed by node type)
const indent = require('./indent');
var backend = {};

///////////////////// Motion ///////////////////// 

backend.turnRight =
backend.turnLeft =
backend.setXPosition =
backend.setYPosition =
backend.changeXPosition =
backend.changeYPosition =
backend.forward = function(node) {
    var dist = this.generateCode(node.inputs[0][0]);
    return `__ENV.${node.type}.call(this, +${dist});`;
};

///////////////////// Control ///////////////////// 
backend.doIfElse = function(node) {
    console.log('>>> node:', node);
    var cond = this.generateCode(node.inputs[0][0]),
        ifTrue = this.generateCode(node.inputs[1][0]),
        ifFalse = this.generateCode(node.inputs[1][1]);

    console.log(ifFalse);
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
        body = this.generateCode(node.inputs[1][0]);

    return [
        `for (var _i = ${count}; _i--;) {`,
        indent(body),
        `}`
    ].join('\n');
};

///////////////////// Looks ///////////////////// 
backend.getScale = function(node) {
    return `__ENV.${node.type}.call(this)`;
};

backend.doSayFor = function(node) {
    var inputs = node.inputs[0].map(this.generateCode);
    inputs[1] = '+' + inputs[1];
    return `__ENV.doSayFor.call(this, ${inputs.join(', ')});`;
};

backend.bubble = function(node) {
    var inputs;

    inputs = this.generateCode(node.inputs[0][0]);
    return `__ENV.bubble.call(this, ${inputs});`;
};

///////////////////// Operators ///////////////////// 
backend.reportEquals = function(node) {
    console.log('<<<< ', node);
    var left = this.generateCode(node.inputs[0][0]),
        right = this.generateCode(node.inputs[1][0]);

    return `+${left} === +${right}`;
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
    var value = this.generateCode(node.inputs[0][1]) || null;

    return `__ENV.${node.type}.call(this, ${name}, ${value});`;
};

backend.doShowVar =
backend.doHideVar = function(node) {
    var name = this.generateCode(node.inputs[0][0]);

    return `__ENV.${node.type}.call(this, ${name});`;
};

backend.doDeclareVariables = function(node) {
    var names = node.inputs[0][0].inputs[0]
        .map(input => this.generateCode(input));
    return `__ENV.${node.type}.call(this, ${names});`;
};

///////////////////// Primitives ///////////////////// 
backend.string = function(node) {
    return `'${node.value}'`;
};

module.exports = backend;
