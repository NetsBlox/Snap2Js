describe('context', function() {
    let fs = require('fs'),
        snap2js = require('..'),
        path = require('path'),
        TEST_CASE_DIR = path.join(__dirname, 'test-cases');


    // Load the d
    describe('default', function() {
        var context;

        before(function() {
            context = snap2js.newContext();
        });

        fs.readdirSync(TEST_CASE_DIR)
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
