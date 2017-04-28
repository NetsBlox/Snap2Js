describe('context', function() {
    let fs = require('fs'),
        snap2js = require('..'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases');


    describe('nop', function() {
        var context;

        before(function() {
            context = snap2js.newContext(snap2js.CONTEXT.NOP);
        });

        fs.readdirSync(TEST_CASE_DIR)
            .filter(filename => !filename.includes('all-control'))
            .forEach(filename => {
                it(`should nop every operation in ${filename}`, function() {
                    var content = fs.readFileSync((path.join(TEST_CASE_DIR, filename)), 'utf8');
                    var bin = snap2js.compile(content)
                    bin(context);
                });

            });
    });
});
