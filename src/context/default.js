const base = require('./nop');
const _ = require('lodash');

var context = _.cloneDeep(base);

// Add the basic overrides
// TODO: Add the sprite, stage, contexts and stuff

context.doYield = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1),
        context = args.pop();

    // TODO: handle the warp
    args.unshift(this);
    setTimeout(() => fn.apply(args), 5);
};

///////////////////// Operators ///////////////////// 
context.reportEquals = function(left, right) {
    return left == right;
};

///////////////////// Variables ///////////////////// 
context.reportListLength = function(name, context) {
    return context.get(name).value.length;
};

context.variable = function(name, context) {
    return context.get(name);
};

context.doChangeVar = function(name, val, context) {
    var variable = context.get(name);
    variable.value = +variable.value + (+val);
};

context.doDeclareVariables = function() {
    var args = Array.prototype.slice.call(arguments),
        context = args.pop();

    for (var i = args.length; i--;) {
        context.set(args[i], 0);
    }
};

context.doAddToList = function(value, name, context) {
    var list = context.get(name);
    if (name && list) {
        list.value.push(value);
    }
};

module.exports = context;
