// nop everything
const backend = require('../backend');
const nop = () => {};

var context = {};
Object.keys(backend).forEach(key => context[key] = nop);

module.exports = context;
