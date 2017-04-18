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
    variable.value = +variable.value + (+val);
};

module.exports = context;
