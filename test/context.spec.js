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
            .filter(filename => filename === 'lists.xml')
            .forEach(filename => {
                it(`should nop every operation in ${filename}`, function(done) {
                    var content = fs.readFileSync((path.join(TEST_CASE_DIR, filename)), 'utf8');
                    snap2js.compile(content)
                        .then(bin => bin(context))
                        .nodeify(done);
                });

            });
    });
});
