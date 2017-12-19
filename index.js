// We will be generating JavaScript code which will call the primitive fns
(function(Snap2Js) {
    const XML_Element = require('./lib/snap/xml');
    const Q = require('q');
    const prettier = require('prettier');
    const fs = require('fs');
    const path = require('path');
    const utils = require('./src/utils');
    const indent = utils.indent;
    const DefaultBackend = require('./src/backend');
    const DefaultContext = require('./src/context/basic');
    const _ = require('lodash');
    const boilerplate = fs.readFileSync(path.join(__dirname, 'src', 'basic.js.ejs'), 'utf8');
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

    const createAstNode = (curr, next) => {
        if (typeof curr !== 'object') {
            return {
                parent: null,
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
            parent: null,
            type: null,
            inputs: null,
            next: next || null
        };

        if (curr.tag === 'custom-block') {
            type = 'evaluateCustomBlock';
            node.value = curr.attributes.s;
            node.id = curr.attributes.collabId;

            // remove receiver if not a global block
            // FIXME: This should actually load the definitions from the receiver
            let lastChild = curr.children[curr.children.length-1];
            if (lastChild && lastChild.tag === 'receiver') {
                let receiver = lastChild.children[0];
                curr.children.pop();
                if (receiver) {
                    Snap2Js.parse(receiver);
                }
            }
        } else if (!curr.attributes) {
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

        if (next) {
            next.parent = node;
        }
        node.inputs = curr.children
            .map(child => {
                let key = child.tag;
                let childNode = null;

                if (key === 'script') {
                    childNode = parseScript(child);
                    if (childNode) childNode.parent = node;

                    return childNode;
                } else if (key === 'l') {
                    if (child.children.length === 1) {
                        childNode = createAstNode(child.children[0]);
                        if (childNode) childNode.parent = node;
                        return childNode;
                    } else if (child.children.length) {
                        let children = child.children.map(createAstNode);
                        children.forEach(child => child.parent = node);
                        return children;
                    }
                    childNode = createAstNode(child.contents);
                    if (childNode) childNode.parent = node;
                    return childNode;
                }
                childNode = createAstNode(child);
                if (childNode) childNode.parent = node;
                return childNode;
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
            blocks,
            dir;

        position.x = model.attributes.x;
        position.y = model.attributes.y;
        dir = model.attributes.heading;
        blocks = model.childNamed('blocks').children;
        return {
            id: model.attributes.collabId,
            name: model.attributes.name,
            variables: parseInitialVariables(model.childNamed('variables').children),
            scripts: parseSpriteScripts(model.childNamed('scripts')),
            customBlocks: blocks.map(Snap2Js.parseBlockDefinition),
            position: position,
            draggable: model.attributes.draggable === 'true',
            rotation: model.attributes.rotation,
            costumeIdx: +model.attributes.costume,
            size: +model.attributes.scale * 100,
            direction: dir
        };
    };

    Snap2Js.parseStage = function(model) {
        let blocks = model.childNamed('blocks').children;

        return {
            customBlocks: blocks.map(Snap2Js.parseBlockDefinition),
            scripts: parseSpriteScripts(model.childNamed('scripts')),
            width: model.attributes.width,
            height: model.attributes.height,
            name: model.attributes.name
        };
    };

    const DEFAULT_BLOCK_FN_TYPE = 'reifyScript';
    Snap2Js.parseBlockDefinition = function(block) {
        var spec = block.attributes.s,
            inputs = utils.inputNames(spec).map(createAstNode),
            ast = parseScript(block.childNamed('script')),
            blockType = block.attributes.type,
            inputTypes,
            blockFnType,
            root,
            name;

        // Detect the fn to use to define the function
        blockFnType = 'reify' + blockType.substring(0,1).toUpperCase() +
            blockType.substring(1);

        if (!Snap2Js._backend[blockFnType]) {
            blockFnType = DEFAULT_BLOCK_FN_TYPE;
        }

        // parse the inputs to make the block def name
        inputTypes = block.childNamed('inputs').children
            .map(child => child.attributes.type);

        name = utils.parseSpec(spec).map(part => {
            if (part[0] === '%' && part.length > 1) {
                return inputTypes.shift();
            }
            return part;
        }).join(' ');

        // Modify the ast to get it to generate an entire fn
        root = {
            type: blockFnType,
            id: block.attributes.collabId,
            inputs: [
                ast,
                {
                    type: 'list',
                    inputs: inputs
                }
            ]
        };
        ast.parent = root;

        return {
            name: name,
            code: Snap2Js.generateCode(root)
        };
    };

    const DEFAULT_STATE = {
        sprites: [],
        stage: {customBlocks: [], scripts: {}},
        variables: {},
        customBlocks: [],
        returnValue: null,
        tempo: 60
    };

    Snap2Js.parse = function(element) {
        let type = element.tag;

        if (Snap2Js.parse[type]) {
            return Snap2Js.parse[type].call(Snap2Js, element);
        } else {
            throw `Unsupported xml type: ${type}`;
        }
    };

    Snap2Js.parse.ref = function(element) {
        return Snap2Js.parse(element.target);
    };

    Snap2Js.parse.project = function(element) {
        var stage = element.childNamed('stage');
        var sprites = stage.childNamed('sprites').childrenNamed('sprite');

        var globalVars = parseInitialVariables(element.childNamed('variables').children);
        var tempo = +stage.attributes.tempo;
        var blocks = element.childNamed('blocks').children;

        sprites.forEach(sprite => Snap2Js.parse(sprite));

        this.state.variables = globalVars;
        this.state.tempo = tempo;
        this.state.stage = Snap2Js.parseStage(stage);
        this.state.customBlocks = blocks.map(Snap2Js.parseBlockDefinition);
    };

    Snap2Js.parse.sprite = function(element) {
        // only add if the sprite hasn't already been parsed
        let name = element.attributes.name;
        let sprite = this.state.sprites.find(sprite => sprite.name === name);
        if (!sprite) {
            this.state.sprites.push(Snap2Js.parseSprite(element));
        } else {
            console.error(`Sprite ${name} already parsed. Skipping...`);
        }
    };

    Snap2Js.parse.context = function(element) {
        let receiver = null;
        if (element.childNamed('receiver')) {  // create the context
            receiver = element.childNamed('receiver').children[0];
            if (receiver.tag === 'ref') receiver = receiver.target;
            Snap2Js.parse(receiver);
        }

        // Add the execution code
        let block = element.children[2];
        let fnNode = null;
        let node = null;
        if (block.tag === 'script') {
            fnNode = parseScript(block);
            let inputEls = element.childNamed('inputs').children;
            let inputNodes = inputEls.map(item => createAstNode(item.contents));
            node = {
                type: 'reifyScript',
                inputs: [fnNode, {type: 'list', inputs: inputNodes}]
            };
            node.inputs.forEach(input => input.parent = node);
        } else {
            fnNode = createAstNode(block);
            let inputEls = element.childNamed('inputs').children;
            let inputNodes = inputEls.map(item => createAstNode(item.contents));
            // use autolambda (auto-returns result) if not a script
            let lambda = {
                type: 'autolambda',
                inputs: [fnNode]
            }
            node = {
                type: 'reifyScript',
                inputs: [lambda, {type: 'list', inputs: inputNodes}]
            };
        }

        node.inputs.forEach(input => input.parent = node);

        let body = `return ${Snap2Js.generateCode(node)}`;

        // TODO: set the 'self' and '__CONTEXT' variables
        // TODO: move this code to the backend...
        if (receiver && receiver.tag === 'sprite') {
            let name = receiver.attributes.name;
            body = `let self = project.sprites.find(sprite => sprite.name === '${name}');\n` +
                `let __CONTEXT = new VariableFrame(self.variables);\n` +
                `${body}`;
        } else {
            body = `let self = project.stage;\n` +
                `let __CONTEXT = new VariableFrame(self.variables);\n` +
                `${body}`;
        }

        let fn = new Function(body);
        this.state.returnValue = `(${fn.toString()})()`;
    };

    Snap2Js.transpile = function(xml) {
        let fn = Snap2Js.compile(xml)
        let code = prettier.format(fn.toString());
        return code;
    };

    Snap2Js._resolveRefs = function(element) {
        let refValues = {},
            allChildren = element.allChildren(),
            refs = [];

        for (let i = allChildren.length; i--;) {
            if (allChildren[i].tag === 'ref') {
                refs.push(allChildren[i]);
            } else if (allChildren[i].attributes.id) {
                refValues[allChildren[i].attributes.id] = allChildren[i];
            }
        }

        for (let i = refs.length; i--;) {
            let id = refs[i].attributes.id;
            refs[i].target = refValues[id];
        }

        return element;
    };

    Snap2Js.resetState = function() {
        this.state = _.merge({}, DEFAULT_STATE);
    };

    Snap2Js.compile = function(xml) {
        var element = new XML_Element();
        element.parseString(xml.toString());

        Snap2Js._resolveRefs(element);
        Snap2Js.parse(element);
        let body = boilerplateTpl(this.state);
        let fn = new Function('__ENV', body);

        this.resetState();
        return fn;
    };

    Snap2Js._initNodeMap = {};
    // TODO: move this to the backend...
    Snap2Js._initNodeMap.receiveOnClone =
    Snap2Js._initNodeMap.receiveGo = function(code, node) {
        return [
            '(function() {',
            'var __CONTEXT = new VariableFrame(self.variables);',
            indent(code),
            '})();'
        ].join('\n');
    };

    Snap2Js._initNodeMap.receiveMessage = function(code, node) {
        var event = Snap2Js.generateCode(node.inputs[0]),
            cond = event === "`any message`" ? 'true' : `event === ${event}`;
        return [
            `if (${cond}) {`,
            'let __CONTEXT = new VariableFrame(self.variables);',
            indent(code),
            '}'
        ].join('\n');
    };

    Snap2Js._initNodeMap.receiveKey = function(code, node) {
        var key = Snap2Js.generateCode(node.inputs[0]),
            cond = key === "'any key'" ? 'true' : `key === ${key}`;

        return [
            `if (${cond}) {`,
            'let __CONTEXT = new VariableFrame(self.variables);',
            indent(code),
            '}'
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
            throw `Unsupported node type: ${root.type}`;
        }

        var code = Snap2Js._backend[root.type].call(Snap2Js, root);
        if (!Snap2Js._backend[root.type].async && root.next) {
            code += `\n.then(() => ${Snap2Js.generateCode(root.next)})`;
        }
        return code.replace(/\);/g, ');\n');
    };

    Snap2Js._backend = {};
    Snap2Js.setBackend = backend => Snap2Js._backend = backend;
    Snap2Js.setBackend(DefaultBackend);

    Snap2Js.CONTEXT = {};
    Snap2Js._contexts = {};

    Snap2Js.CONTEXT.NOP = 'nop';
    Snap2Js.CONTEXT.DEFAULT = 'basic';
    Snap2Js._contexts.basic = DefaultContext;
    Snap2Js._contexts.nop = require('./src/context/nop');

    Snap2Js.newContext = type => _.cloneDeep(Snap2Js._contexts[type || Snap2Js.CONTEXT.DEFAULT]);
    Snap2Js.resetState();

})(module.exports);
