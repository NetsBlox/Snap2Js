// nop everything
const base = require('./nop');
const _ = require('lodash');

var context = _.cloneDeep(base);

// Add the basic overrides

module.exports = context;
