describe('compilation', function() {
    const fs = require('fs');
    const snap2js = require('..');
    const path = require('path');
    const utils = require('./utils');
    let context;

    before(function() {
        context = snap2js.newContext(snap2js.CONTEXT.NOP);
    });

    utils.getProjectPaths()
        .filter(filename => !filename.includes('all-control'))
        //.filter(filename => filename.includes('custom-block-inputs'))
        .forEach(filename => {
            it(`should nop every operation in ${filename}`, function() {
                var content = fs.readFileSync(filename, 'utf8');
                var bin = snap2js.compile(content)
                bin(context);
            });

        });
});
