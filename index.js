// We will be generating JavaScript code which will call the primitive fns
// TODO
(function(Snap2Js) {
    const xml2js = require('xml2js');
    const Q = require('q');
    const fs = require('fs');
    const inputFilename = process.argv[2];

    const parseSpriteScripts = model => {
        var scripts = model.sprite[0].scripts[0].script;
        console.log('getting scripts for', model.sprite[0]['$'].name);
        console.log(scripts);
        console.log();
        return scripts.map(model => parseScript(model.block))
    };

    const createAstNode = (curr, next) => {
        // TODO: Parse input blocks
        var inputs = (curr.l || []).map(input =>
            typeof input === 'object' ? createAstNode(input) : input
        );
        return {
            type: curr['$'].s,
            inputs: curr.l && inputs,
            next: next || null
        };
    };

    const parseScript = blocks => {
        var rootNode,
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

    var indent = lines => '  ' + lines.replace(/\n/g, '  ');
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
        if (!Snap2Js._nodeMap[root.type]) throw `Unsupported node type: ${root.type}`;

        if (root.next) {
            return [
                Snap2Js._nodeMap[root.type](root),
                Snap2Js.generateCode(root.next)
            ].join('\n');
        } else {
            return Snap2Js._nodeMap[root.type](root)
        }
    };

    Snap2Js._nodeMap = {};

    var isAstNode = val => typeof val === 'object' && val.type;

    Snap2Js._nodeMap.bubble = function(node) {
        var inputs;

        if (isAstNode(node.inputs[0])) {
            inputs = Snap2Js.generateCode(node.inputs[0]);
        } else {
            inputs = `'${node.inputs[0]}'`;
        }
        return `__ENV.bubble(${inputs});`;
    };

    Snap2Js._nodeMap.turnLeft = function(node) {
        return '// When I turn left... TODO';
        // TODO
    };


})(module.exports);
