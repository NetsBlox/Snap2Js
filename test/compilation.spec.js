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
        .forEach(filename => {
            it(`should nop every operation in ${filename}`, async function() {
                // TODO: Some seem like they are not terminating
                const content = fs.readFileSync(filename, 'utf8');
                console.log('compiling', filename);
                const bin = snap2js.compile(content)
                console.log('running', filename);
                bin(context);
            });

        });

    describe('custom blocks', function() {
        it('should be able to compile custom blocks w/o a def', function() {
            const content = utils.getContextXml('block-child-null');
            snap2js.compile(content)
        });
    });
});
