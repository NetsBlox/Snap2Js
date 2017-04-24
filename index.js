// We will be generating JavaScript code which will call the primitive fns
(function(Snap2Js) {
    //const xml2js = require('xml2js');
    const XML_Element = require('./src/snap/xml');
    const Q = require('q');
    const prettier = require('prettier');
    const fs = require('fs');
    const inputFilename = process.argv[2];
    const indent = require('./src/indent');
    const DefaultBackend = require('./src/backend');
    const DefaultContext = require('./src/context/default');
    const _ = require('lodash');
    const boilerplate = fs.readFileSync('./src/base.js.ejs', 'utf8');
    const boilerplateTpl = _.template(boilerplate);

    const omit = function(obj) {  // for debugging
        var keys = Object.keys(obj);
        var omitted = Array.prototype.slice.call(arguments, 1);
        var newObj = {};

        for (var i = keys.length; i--;) {
            if (!omitted.includes(keys[i])) {
                newObj[keys[i]] = obj[keys[i]];
            }
        }
        return newObj;
    };

    const parseSpriteScripts = model => {
        var asts = model.children.map(parseScript),
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
        if (typeof curr !== 'object') {
            return {
                type: typeof curr,
                value: curr
            };
        }

        if (curr.tag === 'color' || curr.tag === 'option')
            return createAstNode(curr.contents)

        var node,
            type;

        node = {
            id: null,
            type: null,
            inputs: null,
            next: next || null
        };

        if (!curr.attributes) {
            type = Object.keys(curr)[0];
            if (type === 'block') {
                throw 'bad parsing';
            }
        } else if (curr.attributes.var) {
            type = 'variable';
            node.value = curr.attributes.var;
        } else {
            type = curr.attributes.s || curr.tag;
            node.id = curr.attributes.collabId;
        }
        if (!type) {
            throw 'bad parsing';
        }

        node.type = type;
        node.inputs = curr.children
            .map(child => {
                var key = child.tag;

                if (key === 'script') {
                    return parseScript(child);
                } else if (key === 'l') {
                    if (child.children.length === 1) {
                        return createAstNode(child.children[0]);
                    } else if (child.children.length) {
                        return child.children.map(createAstNode);
                    }
                    return createAstNode(child.contents);
                }
                return createAstNode(child);
            });

        if (curr.contents) {
            node.value = curr.contents;
        }
        return node;
    };

    const parseScript = script => {
        var rootNode,
            blocks = script.children,
            last;

        for (var i = blocks.length; i--;) {
            last = createAstNode(blocks[i], last);
        }
        //adf;
        return last;
    };

    parseVariableValue = function(variable) {

        if (variable.tag === 'bool') {
            return variable.contents === 'true';
        } else if (variable.tag === 'l') {
            return variable.contents;
        } else if (variable.tag === 'list') {
            return variable.children.map(child => {
                return parseVariableValue(child.children[0]);
            });
        }
        return 0;
    };

    parseInitialVariables = function(vars) {
        var context = {},
            variable;

        vars = vars || [];
        for (var i = vars.length; i--;) {
            variable = vars[i];
            context[variable.attributes.name] = parseVariableValue(variable.children[0]);
        }
        return context;
    };

    Snap2Js.parseSprite = function(model) {
        var position = {},
            dir;

        position.x = model.attributes.x;
        position.y = model.attributes.y;
        dir = model.attributes.heading;
        return {
            id: model.attributes.collabId,
            name: model.attributes.name,
            variables: parseInitialVariables(model.childNamed('variables').children),
            scripts: parseSpriteScripts(model.childNamed('scripts')),
            position: position,
            costumeIdx: +model.attributes.costume,
            size: +model.attributes.scale * 100,
            direction: dir
        };
    };

    Snap2Js.parse = function(content) {
        var element = new XML_Element();
        element.parseString(content.toString());

        var stage = element.childNamed('stage');
        var sprites = stage.childNamed('sprites').childrenNamed('sprite');

        var globalVars = parseInitialVariables(element.childNamed('variables').children);
        var tempo = +stage.attributes.tempo;
        return {
            variables: globalVars,
            tempo: tempo,
            sprites: sprites.map(Snap2Js.parseSprite),
        };

    };

    Snap2Js.compile = function(xml) {
        var code = Snap2Js.transpile(xml)
        return new Function('__ENV', code);
    };

    Snap2Js.transpile = function(xml) {
        var state = Snap2Js.parse(xml);
        var code = boilerplateTpl(state);

        code = prettier.format(code);
        return code;
    };

    Snap2Js._initNodeMap = {};
    Snap2Js._initNodeMap.receiveGo = function(code, node) {
        return [
            '(function() {',
            'var __CONTEXT = new VariableFrame(self.variables);',
            indent(code),
            '})();'
        ].join('\n');
    };

    Snap2Js.generateScriptCode = function(root) {
        if (Snap2Js._initNodeMap[root.type]) {
            return Snap2Js._initNodeMap[root.type](Snap2Js.generateCode(root.next), root);
        } else {
            console.error('warn: script does not start with supported init node:', root.type);
        }
    };

    Snap2Js.generateCode = function(root) {
        if (!Snap2Js._backend[root.type]) {
            console.log(JSON.stringify(root, null, 2));
            throw `Unsupported node type: ${root.type}`;
        }

        var code = Snap2Js._backend[root.type].call(Snap2Js, root);
        if (!Snap2Js._backend[root.type].async && root.next) {
            code += '\n' + Snap2Js.generateCode(root.next);
        }
        return code.replace(/\);/g, ');\n');
    };

    Snap2Js._backend = {};
    Snap2Js.setBackend = backend => Snap2Js._backend = backend;
    Snap2Js.setBackend(DefaultBackend);

    Snap2Js.CONTEXT = {};
    Snap2Js._contexts = {};

    Snap2Js.CONTEXT.NOP = 'nop';
    Snap2Js.CONTEXT.DEFAULT = 'default';
    Snap2Js._contexts.default = DefaultContext;
    Snap2Js._contexts.nop = require('./src/context/nop');

    Snap2Js.newContext = type => _.cloneDeep(Snap2Js._contexts[type || Snap2Js.CONTEXT.DEFAULT]);

})(module.exports);
