// nop everything
const backend = require('../backend');
const nop = () => {};

var context = {};
Object.keys(backend).forEach(key => context[key] = nop);

// special cases
context.doYield = nop;
context.__start = nop;

module.exports = context;
