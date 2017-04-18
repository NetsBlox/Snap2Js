// We will be generating JavaScript code which will call the primitive fns
(function(Snap2Js) {
    const xml2js = require('xml2js');
    const Q = require('q');
    const fs = require('fs');
    const inputFilename = process.argv[2];
    const indent = require('./src/indent');
    const DefaultBackend = require('./src/backend');
    const DefaultContext = require('./src/context/default');
    const _ = require('lodash');
    const boilerplate = fs.readFileSync('./src/base.js.ejs', 'utf8');
    const boilerplateTpl = _.template(boilerplate);

    const parseSpriteScripts = model => {
        var rawScripts = model.sprite[0].scripts[0].script,
            asts = rawScripts.map(parseScript),
            eventHandlers = {},
            code;

        for (var i = asts.length; i--;) {
            code = Snap2Js.generateScriptCode(asts[i]);
            if (code) {
                if (!eventHandlers[asts[i].type]) {
                    eventHandlers[asts[i].type] = [];
                }
                eventHandlers[asts[i].type].push(code);
            }
        }
        return eventHandlers;
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

        node = {
            id: null,
            type: null,
            inputs: null,
            next: next || null
        };

        if (!curr['$']) {
            type = Object.keys(curr)[0];
            if (type === 'block') {
                throw 'bad parsing';
            }
        } else if (curr['$'].var) {
            type = 'variable';
            node.value = curr['$'].var;
        } else {
            type = curr['$'].s;
            node.id = curr['$'].collabId;
        }
        if (type === 'undefined') {
            throw 'bad parsing';
        }

        node.type = type;
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

        return node;
    };

    const parseScript = script => {
        var rootNode,
            blocks = script.block,
            last;

        for (var i = blocks.length; i--;) {
            last = createAstNode(blocks[i], last);
        }
        return last;
    };

    parseVariableValue = function(variable) {
        var value = 0;

        if (variable.l) {
            value = variable.l[0];
        } else if (variable.list) {
            value = variable.list[0].item.map(item => parseVariableValue(item));
        }
        return value;
    };

    parseInitialVariables = function(vars) {
        var context = {},
            variable;

        for (var i = vars.length; i--;) {
            variable = vars[i];
            context[variable['$'].name] = parseVariableValue(variable);
        }
        console.log(context);
        return context;
    };

    Snap2Js.parseSprite = function(raw) {
        var rawSprite = raw.sprite[0];
        var sprite = {
            id: rawSprite['$'].collabId,
            name: rawSprite['$'].name,
            variables: parseInitialVariables(rawSprite.variables[0].variable),
            scripts: parseSpriteScripts(raw)
        };
        return sprite;
    };

    // This is odd because we need different contexts for each sprite...
    // TODO
    Snap2Js.parse = function(content) {
        return Q.nfcall(xml2js.parseString, content).then(parsed => {
                var sprites = parsed.project.stage[0].sprites;
                return sprites.map(Snap2Js.parseSprite);
            });

    };

    Snap2Js.compile = function(xml) {
        return Snap2Js.transpile(xml)
            .then(src => {
                console.log(src);
                return new Function('__ENV', src);
            });
    };

    Snap2Js.transpile = function(xml) {
        return Snap2Js.parse(xml)
            .then(sprites => {
                console.log(sprites[0].scripts);

                // TODO: for now, we will ignore sprite var scoping
                var code = boilerplateTpl({sprites: sprites});
                console.log(code);

                // TODO: Add context info
                return code;
            });
    };

    Snap2Js._initNodeMap = {};
    Snap2Js._initNodeMap.receiveGo = function(code, node) {
        // TODO: add script context
        return [
            '(function() {',
            indent(code),
            '})()'
        ].join('\n');
    };

    Snap2Js.generateScriptCode = function(root) {
        if (Snap2Js._initNodeMap[root.type]) {
            var code = Snap2Js.generateCode(root.next);
            console.log();
            console.log('--- code');
            console.log(code);
            return Snap2Js._initNodeMap[root.type](Snap2Js.generateCode(root.next), root);
        } else {
            console.error('warn: script does not start with supported init node:', root.type);
        }
    };

    Snap2Js.generateCode = function(root) {
        if (!Snap2Js._backend[root.type]) {
            console.log();
            console.log();
            console.log(root);
            console.log();
            console.log();
            throw `Unsupported node type: ${root.type}`;
        }

        //console.log('-- START', root.type);
        var code = Snap2Js._backend[root.type].call(Snap2Js, root);
        if (!Snap2Js._backend[root.type].async && root.next) {
            code += '\n' + Snap2Js.generateCode(root.next);
        }
        //console.log('-- END', root.type);
        return code.replace(/\);/g, ');\n');
    };

    Snap2Js._backend = {};
    Snap2Js.setBackend = backend => Snap2Js._backend = backend;
    Snap2Js.setBackend(DefaultBackend);

    Snap2Js.CONTEXT = {};
    Snap2Js.CONTEXT.NOP = 'nop';
    Snap2Js.CONTEXT.DEFAULT = 'default';
    Snap2Js._contexts = {};
    Snap2Js._contexts.default = DefaultContext;
    Snap2Js._contexts.nop = require('./src/context/nop');
    Snap2Js.newContext = type => _.cloneDeep(Snap2Js._contexts[type || Snap2Js.CONTEXT.DEFAULT]);

})(module.exports);
