describe('errors', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const utils = require('./utils');
    const Q = require('q');

    it('should be able to catch error', function(done) {
        let cxt = snap2js.newContext();
        let content = utils.getContextXml('list-err');
        let bin = snap2js.compile(content);
        let fn = bin(cxt);
        fn().catch(err => done())
    });

    it.skip('should return the failing block id', function() {
        let cxt = snap2js.newContext();

        let content = utils.getContextXml('list-err');
        console.log(snap2js.transpile(content));

        let bin = snap2js.compile(content);
        let fn = bin(cxt);
        console.log(fn.toString());
        try {
            Q(fn())
                .catch(err => console.error('error:', err));
            console.log('no error');
        } catch (e) {
            console.log('err', e);
        }
    });

});
