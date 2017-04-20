// nop everything
const backend = require('../backend');
const nop = () => {};

var context = {};
Object.keys(backend).forEach(key => context[key] = nop);
context.doYield = nop;  // special case

module.exports = context;
