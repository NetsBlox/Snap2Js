const base = require('./basic');
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

context.__start = function(project) {
    var stdin = process.openStdin();
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    stdin.on('data', (key) => {
        if (key === '\u0003') process.exit();

        switch (key) {
            case '\u001b[A':
                key = 'up arrow';

            case '\u001b[B':
                key = 'down arrow';

            case '\u001b[C':
                key = 'right arrow';

            case '\u001b[C':
                key = 'left arrow';

            case ' ':
                key = 'space';
        }

        project.sprites.concat([project.stage])
            .forEach(obj => obj.onKeyPressed(key));
    });
};

module.exports = context;
