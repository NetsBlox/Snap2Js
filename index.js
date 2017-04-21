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

    var createNode = {};
    //createNode.reportNewList = curr => {
        //console.log(JSON.stringify(curr.list[0], null, 2));
        //console.log(JSON.stringify(curr.list[1], null, 2));
        //asdf;
        //// The ordering is lost... this sucks...
        //return {
            //id: curr['$'].collabId,
            //inputs: curr.list
        //};
    //};

    const createAstNode = (curr, next) => {
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

        if (!curr.attributes) {
            type = Object.keys(curr)[0];
            if (type === 'block') {
                throw 'bad parsing';
            }
        } else if (curr.attributes.var) {
            type = 'variable';
            node.value = curr.attributes.var;
        } else {
            type = curr.attributes.s;
            node.id = curr.attributes.collabId;
        }
        if (type === 'undefined') {
            throw 'bad parsing';
        }

        console.log();
        node.type = type;
        node.inputs = curr.children
            .map(child => {
                var key = child.tag;

                console.log();
                console.log(key);
                console.log(child);

                if (key === 'l') {
                    console.log(type);
                    console.log('---');
                }

                if (key === 'l') {
                    if (child.children.length) {
                        return child.children.map(createAstNode);
                    }
                    return createAstNode(child.contents)
                }
                return createAstNode(child);
                //if (key === 'script') {
                    //adsf;
                    //return curr[key].map(parseScript);
                ////} else if (curr[key][0].block && !curr[key][0]['$']){
                    ////// This is a multiargmorph that is part of a larger block
                    ////// (but not a standalone block)
                    ////if (curr[key].length > 1) {
                        ////throw 'Ran into something strange. Please report this case';
                    ////}
                    ////return curr[key][0].block.map(item => createAstNode(item));
                //} else {
                    //return createAstNode(child);
                //}
            });

        console.log();
        console.log('node');
        console.log(JSON.stringify(node, null, 2));
        return node;
    };

    const parseScript = script => {
        var rootNode,
            blocks = script.children,
            last;

        for (var i = blocks.length; i--;) {
            last = createAstNode(blocks[i], last);
        }
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
