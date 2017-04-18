const base = require('./nop');
const _ = require('lodash');

var context = _.cloneDeep(base);

// Add the basic overrides
// TODO: Add the sprite, stage, contexts and stuff

// Add the basic overrides

///////////////////// Variables ///////////////////// 
context.reportListLength = function(name) {
    return this.variables.get(name).length;
};

context.variable = function(name, context) {
    return context.get(name);
};

context.doChangeVar = function(name, val, context) {
    var variable = context.get(name);
    console.log('getting', name);
    variable.value = +variable.value + (+val);
};

context.doDeclareVariables = function() {
    var args = Array.prototype.slice.call(arguments),
        context = args.pop();

    console.log(arguments);
    console.log('declaring', args[i]);
    for (var i = args.length; i--;) {
        context.set(args[i], 0);
    }
};

module.exports = context;
