// nop everything
const backend = require('../backend');
const nop = () => {};
const SPromise = require('synchronous-promise').SynchronousPromise;

var context = {};
Object.keys(backend).forEach(key => context[key] = nop);

// special cases
context.doYield = nop;
context.__start = nop;
context.SPromise = SPromise;

module.exports = context;
