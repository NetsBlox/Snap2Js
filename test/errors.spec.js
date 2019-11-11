describe('errors', function() {
    const snap2js = require('..');
    const assert = require('assert');
    const utils = require('./utils');

    describe('basic', function() {
        it('should be able to catch error', async function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('list-err');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            try {
                await fn();
            } catch (err) {
                if (err instanceof TypeError) {
                    done();
                } else {
                    done(err);
                }
            }
        });

        it.skip('should return the failing block id', async function() {
            let cxt = snap2js.newContext();

            let content = utils.getContextXml('list-err');
            console.log(snap2js.transpile(content));

            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            console.log(fn.toString());
            try {
                await fn();
                console.log('no error');
            } catch (e) {
                console.log('err', e);
            }
        });
    });

    describe('in repeat loop', function() {
        it('should be able to catch error', function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('list-err-loop');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            fn().catch(err => done())
        });
    });

    describe('in repeat until', function() {
        it('should be able to catch error', function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('list-err-until');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            fn().catch(err => done())
        });
    });

    describe('in forever', function() {
        it('should be able to catch error', function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('list-err-forever');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            fn().catch(err => done())
        });
    });

    describe('in warp', function() {
        it('should be able to catch error', async function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('list-err-warp');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            try {
                await fn();
            } catch (err) {
                if (err instanceof TypeError) {
                    done();
                }
            }
        });
    });

    describe('undef var', function() {
        it('should be able to catch error', async function(done) {
            let cxt = snap2js.newContext();
            let content = utils.getContextXml('undef-var-err');
            let bin = snap2js.compile(content);
            let fn = bin(cxt);
            try {
                await fn();
            } catch (err) {
                assert(err instanceof Error);
                done();
            }
        });
    });
});
