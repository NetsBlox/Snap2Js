describe('sprite', function() {
    const utils = require('./utils');
    const assert = require('assert');
    const snap2js = require('..');

    it('should record draggable', function() {
        let bin = utils.getCompiledVersionOf('draggable');
        let cxt = snap2js.newContext();
        cxt['doReport'] = function() {
            assert.equal(this.draggable, true);
        };
        bin(cxt);
    });

    it('should record rotation style', function() {
        let bin = utils.getCompiledVersionOf('draggable');
        let cxt = snap2js.newContext();
        cxt['doReport'] = function() {
            assert.equal(this.rotation, 1);
        };
        bin(cxt);
    });
});
