const base = require('./default');
const clone = require('../utils').clone;
const readline = require('readline-sync');

var context = clone(base);
var lastAnswer = '';

context.doAsk = question => {
    lastAnswer = readline.question(question + '\n');
};

context.getLastAnswer = function(node) {
    return lastAnswer;
};

// TODO: Add support for key events

module.exports = context;
