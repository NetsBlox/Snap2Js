describe('new-blocks-1320', function() {
    let result;
    const utils = require('./utils');
    const snap2js = require('..');
    const assert = require('assert');
    const createTest = (pair, index) => {
        it('should ' + pair[0] + ' correctly', function() {
            assert.equal(result[index], pair[1]);
        });
    };

    describe('new blocks 1320', function() {
        before(async function() {
            result = await utils.compileAndRun('new-blocks-1320');
        });

        it('should support variadic sum', function() {
            assert.deepStrictEqual(result[0], [14, 21, 0]);
        });
        it('should support variadic product', function() {
            assert.deepStrictEqual(result[1], [126, 1680, 1]);
        });
        it('should support variadic min', function() {
            assert.deepStrictEqual(result[2], [1, 2, Infinity]);
        });
        it('should support variadic max', function() {
            assert.deepStrictEqual(result[3], [10, 12, -Infinity]);
        });
        it('should support atan2', function() {
            assert(Math.abs(result[4][0] - 53.13010235) <= 1e-5);
            assert(Math.abs(result[4][1] + 53.13010235) <= 1e-5);
            assert(Math.abs(result[4][2] - 126.8698976) <= 1e-5);
            assert(Math.abs(result[4][3] + 126.8698976) <= 1e-5);
        });
        it('should support <=', function() {
            assert.deepStrictEqual(result[5], [true, true, false]);
        });
        it('should support >=', function() {
            assert.deepStrictEqual(result[6], [false, true, true]);
        });
        it('should support !=', function() {
            assert.deepStrictEqual(result[7], [true, false, true]);
        });
        it('should support length list attribute', function() {
            assert.deepStrictEqual(result[8], [10, 4, 3]);
        });
        it('should support rank list attribute', function() {
            assert.deepStrictEqual(result[9], [1, 2, 3]);
        });
        it('should support dimensions list attribute', function() {
            assert.deepStrictEqual(result[10], [[10], [4, 10], [3, 2, 10]]);
        });
        it('should support flatten list attribute', function() {
            assert.deepStrictEqual(result[11], [
                [1,2,3,4,5,6,7,8,9,10],
                [1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10,1,2,3,4,5,6,7,8,9,10],
                ['1',1,2,3,4,5,6,7,8,9,10,'3'],
            ]);
        });
        it('should support columns list attribute', function() {
            assert.deepStrictEqual(result[12], [
                [[1,2,3,4,5,6,7,8,9,10]],
                [[1,1,1,1], [2,2,2,2], [3,3,3,3], [4,4,4,4], [5,5,5,5], [6,6,6,6], [7,7,7,7], [8,8,8,8], [9,9,9,9], [10,10,10,10]],
                [['1','3',''], [[1,2,3,4,5,6,7,8,9,10], '3', '']],
            ]);
        });
        it('should support reverse list attribute', function() {
            assert.deepStrictEqual(result[13], [
                [10,9,8,7,6,5,4,3,2,1],
                [[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10]],
                [[], '3', ['1', [1,2,3,4,5,6,7,8,9,10]]],
            ]);
        });
        it('should support lines list attribute', function() {
            assert.deepStrictEqual(result[14], '1\n2\n3\n4\n5\n6\n7\n8\n9\n10');
        });
        it('should support csv list attribute', function() {
            assert.deepStrictEqual(result[15], [
                '1,2,3,4,5,6,7,8,9,10',
                '1,2,3,4,5,6,7,8,9,10\n1,2,3,4,5,6,7,8,9,10\n1,2,3,4,5,6,7,8,9,10\n1,2,3,4,5,6,7,8,9,10',
                'test world,"anoth, test","ag""ain",ano\'ther,"""test"""',
            ]);
        });
        it('should support json list attribute', function() {
            assert.deepStrictEqual(result[16], [
                '[1,2,3,4,5,6,7,8,9,10]',
                '[[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10],[1,2,3,4,5,6,7,8,9,10]]',
                '[["1",[1,2,3,4,5,6,7,8,9,10]],"3",[]]',
            ]);
        });
        it('should support reshape list', function() {
            assert.deepStrictEqual(result[17], [
                [[1,2],[3,4],[5,6],[7,8],[9,10]],
                [
                    [[[1,2,3,4,5],[6,7,8,9,10]], [[1,2,3,4,5],[6,7,8,9,10]]],
                    [[[1,2,3,4,5],[6,7,8,9,10]], [[1,2,3,4,5],[6,7,8,9,10]]],
                    [[[1,2,3,4,5],[6,7,8,9,10]], [[1,2,3,4,5],[6,7,8,9,10]]],
                    [[[1,2,3,4,5],[6,7,8,9,10]], [[1,2,3,4,5],[6,7,8,9,10]]],
                    [[[1,2,3,4,5],[6,7,8,9,10]], [[1,2,3,4,5],[6,7,8,9,10]]],
                ],
                [[[1,2,3,4,5]], [[6,7,8,9,10]]],
            ]);
        });
        it('should support combinations (really cartesian product) of lists', function() {
            assert.deepStrictEqual(result[18], [
                [1,7], [1,8], [1,9], [1,10], [1,11],
                [2,7], [2,8], [2,9], [2,10], [2,11],
                [3,7], [3,8], [3,9], [3,10], [3,11],
                [4,7], [4,8], [4,9], [4,10], [4,11],
            ]);
            assert.deepStrictEqual(result[19], [
                [1,7,13], [1,7,14],
                [1,8,13], [1,8,14],
                [1,9,13], [1,9,14],
                [1,10,13], [1,10,14],
                [1,11,13], [1,11,14],

                [2,7,13], [2,7,14],
                [2,8,13], [2,8,14],
                [2,9,13], [2,9,14],
                [2,10,13], [2,10,14],
                [2,11,13], [2,11,14],

                [3,7,13], [3,7,14],
                [3,8,13], [3,8,14],
                [3,9,13], [3,9,14],
                [3,10,13], [3,10,14],
                [3,11,13], [3,11,14],

                [4,7,13], [4,7,14],
                [4,8,13], [4,8,14],
                [4,9,13], [4,9,14],
                [4,10,13], [4,10,14],
                [4,11,13], [4,11,14],
            ]);
        });
    });
});
