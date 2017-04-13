// We will be generating JavaScript code which will call the primitive fns
// TODO
(function(Snap2Js) {
    const xml2js = require('xml2js');
    const Q = require('q');
    const fs = require('fs');
    const inputFilename = process.argv[2];
    const indent = lines => '  ' + lines.replace(/\n/g, '  ');

    const parseSpriteScripts = model => {
        var scripts = model.sprite[0].scripts[0].script;
        return scripts.map(parseScript);
    };

    const createAstNode = (curr, next) => {
        // TODO: Parse input blocks
        if (typeof curr !== 'object') {
            return {
                type: typeof curr,
                value: curr
            };
        }

        var node,
            type;

        if (!curr['$']) {
            type = Object.keys(curr)[0];
            if (type === 'block') {
                console.log();
                console.log(curr);
                throw 'bad parsing';
            }
        } else {
            type = curr['$'].s;
        }
        if (type === 'undefined') {
            console.log();
            console.log(curr);
            throw 'bad parsing';
        }

        node = {
            type: type,
            inputs: null,
            next: next || null
        };

        node.inputs = Object.keys(curr)
            .filter(key => key !== '$')
            .map(key => {
                var is2dArray = curr[key][0] instanceof Array;

                if (key === 'script') {
                    return curr[key].map(parseScript);
                } else {
                    return curr[key].map(createAstNode);
                }
            });

        if (type === 'doIfElse') {
            console.log();
            console.log('if-else');
            console.log(curr);
            console.log(curr.block[0].block);
            console.log();
        }
        return node;
    };

    const parseScript = script => {
        var rootNode,
            blocks = script.block,
            last;

        for (var i = blocks.length; i--;) {
            console.log('i', i);
            console.log(blocks[i]);
            last = createAstNode(blocks[i], last);
        }
        return last;
    };

    // This is odd because we need different contexts for each sprite...
    // TODO
    Snap2Js.parse = function(content) {
        return Q.nfcall(xml2js.parseString, content).then(parsed => {
                var sprites = parsed.project.stage[0].sprites;

                console.log('sprite scripts', sprites[0].sprite[0].scripts[0]);
                const scripts = sprites.map(parseSpriteScripts);

                console.log(scripts);
                return scripts;
            });

    };

    Snap2Js.compile = function(xml) {
        return Snap2Js.transpile(xml)
            .then(src => {
                return new Function('__ENV', src);
            });
    };

    Snap2Js.transpile = function(xml) {
        return Snap2Js.parse(xml)
            .then(asts => {
                // TODO: for now, we will ignore sprite var scoping
                asts = asts.reduce((l1, l2) => l1.concat(l2), []);

                console.log('asts', asts);
                // TODO: Create the src code

                var code = asts.map(Snap2Js.generateScriptCode).join('\n\n');
                // TODO: Add context info
                return [
                    '__ENV = __ENV || this;',
                    code.replace(/\n/g, '  \n')
                ].join('\n')
            });
    };

    Snap2Js._initNodeMap = {};
    Snap2Js._initNodeMap.receiveGo = function(code, node) {
        return [
            '(function() {',
            indent(code),
            '})()'
        ].join('\n');
        // TODO:
    };

    Snap2Js.generateScriptCode = function(root) {
        if (Snap2Js._initNodeMap[root.type]) {
            return Snap2Js._initNodeMap[root.type](Snap2Js.generateCode(root.next), root);
        } else {
            console.error('warn: script does not start with supported init node:', root.type);
        }
    };

    Snap2Js.newContext = () => { return {}; };
    Snap2Js.generateCode = function(root) {
        if (!Snap2Js._nodeMap[root.type]) {
            console.log();
            console.log();
            console.log(root);
            console.log();
            console.log();
            throw `Unsupported node type: ${root.type}`;
        }

        var code = Snap2Js._nodeMap[root.type](root);
        if (!Snap2Js._nodeMap[root.type].async && root.next) {
            code += '\n' + Snap2Js.generateCode(root.next);
        }
        return code;
    };

    Snap2Js._nodeMap = {};

    var isAstNode = val => typeof val === 'object' && val.type;

    // Templates...
    Snap2Js._nodeMap.bubble = function(node) {
        var inputs;

        inputs = Snap2Js.generateCode(node.inputs[0][0]);
        console.log('inputs', inputs);
        return `__ENV.bubble(${inputs});`;
    };

    Snap2Js._nodeMap.doIfElse = function(node) {
        console.log('>>> node:', node);
        var cond = Snap2Js.generateCode(node.inputs[0][0]),
            ifTrue = Snap2Js.generateCode(node.inputs[1][0]),
            ifFalse = Snap2Js.generateCode(node.inputs[1][1]);

        console.log(ifFalse);
        return [
            `if (${cond}) {`,
            indent(ifTrue),
            `} else {`,
            indent(ifFalse),
            `}`
        ].join('\n');
    };

    Snap2Js._nodeMap.reportEquals = function(node) {
        console.log('<<<< ', node);
        var left = Snap2Js.generateCode(node.inputs[0][0]),
            right = Snap2Js.generateCode(node.inputs[1][0]);

        return `+${left} === +${right}`;
    };

    Snap2Js._nodeMap.string = function(node) {
        return `'${node.value}'`;
    };

    Snap2Js._nodeMap.getScale = function(node) {
        return `__ENV.${node.type}()`;
    };

    Snap2Js._nodeMap.doSayFor = function(node) {
        var inputs = node.inputs[0].map(Snap2Js.generateCode);
        inputs[1] = '+' + inputs[1];
        return `__ENV.doSayFor(${inputs.join(', ')});`;
    };

    Snap2Js._nodeMap.reportJoinWords = function(node) {
        var listInput = node.inputs[0][0],
            inputs = listInput.inputs[0].map(Snap2Js.generateCode);

        return `[${inputs.join(',')}].join('')`;
    };

    Snap2Js._nodeMap.turnLeft = function(node) {
        // TODO
        return '__ENV.turnLeft(${inputs.join(', ')})';
    };

    Snap2Js._nodeMap.forward = function(node) {
        var dist = Snap2Js.generateCode(node.inputs[0][0]);
        return `__ENV.${node.type}(${dist});`;
    };

})(module.exports);
