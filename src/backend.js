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
    return `__ENV.${node.type}(+${dist});`;
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

///////////////////// Primitives ///////////////////// 
backend.string = function(node) {
    return `'${node.value}'`;
};

///////////////////// Looks ///////////////////// 
backend.getScale = function(node) {
    return `__ENV.${node.type}()`;
};

backend.doSayFor = function(node) {
    var inputs = node.inputs[0].map(this.generateCode);
    inputs[1] = '+' + inputs[1];
    return `__ENV.doSayFor(${inputs.join(', ')});`;
};

backend.bubble = function(node) {
    var inputs;

    inputs = this.generateCode(node.inputs[0][0]);
    return `__ENV.bubble(${inputs});`;
};

module.exports = backend;
