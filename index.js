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

    Snap2Js.parseSpriteScripts = function(model) {
        var asts = model.children.map(child => this.parseScript(child)),
            eventHandlers = {},
            code;

        for (var i = asts.length; i--;) {
            code = this.generateScriptCode(asts[i]);
            if (code) {
                if (!eventHandlers[asts[i].type]) {
                    eventHandlers[asts[i].type] = [];
                }
                eventHandlers[asts[i].type].push(code);
            }
        }
        return eventHandlers;
    };

    Snap2Js.createAstNode = function(curr, next) {
        if (typeof curr !== 'object') {
            return {
                parent: null,
                type: typeof curr,
                value: curr
            };
        }

        if (curr.tag === 'color' || curr.tag === 'option')
            return this.createAstNode(curr.contents)

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
                    this.parse(receiver);
                }
            }
        } else if (!curr.attributes) {
            type = Object.keys(curr)[0];
            if (type === 'block') {
                throw new Error('bad parsing');
            }
        } else if (curr.attributes.var) {
            type = 'variable';
            node.value = curr.attributes.var;
        } else {
            type = curr.attributes.s || curr.tag;
            node.id = curr.attributes.collabId;
        }
        if (!type) {
            throw new Error('bad parsing');
        }

        node.type = type;

        if (node.id) node.id = node.id.replace(/[^a-zA-Z0-9]/g, '_');
        if (next) {
            next.parent = node;
        }
        node.inputs = curr.children
            .map(child => {
                let key = child.tag;
                let childNode = null;

                if (key === 'script') {
                    childNode = this.parseScript(child);
                    if (childNode) childNode.parent = node;

                    return childNode;
                } else if (key === 'l') {
                    if (child.children.length === 1) {
                        childNode = this.createAstNode(child.children[0]);
                        if (childNode) childNode.parent = node;
                        return childNode;
                    } else if (child.children.length) {
                        let children = child.children.map(child => this.createAstNode(child));
                        children.forEach(child => child.parent = node);
                        return children;
                    }
                    childNode = this.createAstNode(child.contents);
                    if (childNode) childNode.parent = node;
                    return childNode;
                }
                childNode = this.createAstNode(child);
                if (childNode) childNode.parent = node;
                return childNode;
            });

        if (curr.contents) {
            node.value = curr.contents;
        }
        return node;
    };

    Snap2Js.parseScript = function(script) {
        var rootNode,
            blocks = script.children,
            last;

        for (var i = blocks.length; i--;) {
            last = this.createAstNode(blocks[i], last);
        }
        return last;
    };

    Snap2Js.getReferenceIndex = function(id) {
        for (let i = this.state.references.length; i--;) {
            if (this.state.references[i].attributes.id === id) {
                return i;
            }
        }
        return -1;
    };

    Snap2Js.REFERENCE_DICT = 'SNAP2JS_REFERENCES';
    Snap2Js.getContentReference = function(id) {
        const index = this.getReferenceIndex(id);
        if (index > -1) {
            return `${Snap2Js.REFERENCE_DICT}[${index}]`;
        }
        return `''`;
    };

    Snap2Js.recordContentReference = function(element) {
        const index = this.getReferenceIndex(element.attributes.id);
        if (index === -1) {
            this.state.references.push(element);
        }
    };

    Snap2Js.parseVariableValue = function(variable) {
        let result = 0;

        if (variable.tag === 'bool') {
            result = variable.contents === 'true';
        } else if (variable.tag === 'l') {
            result = utils.sanitize(variable.contents);
        } else if (variable.tag === 'list') {
            if (variable.attributes.id) {
                result = this.getContentReference(variable.attributes.id);
            } else {  // unreferenced list literal
                result = '[' + variable.children.map(child => {
                    return this.parseVariableValue(child.children[0]);
                }).join(',') + ']';
            }
        } else if (variable.tag === 'ref') {
            result = this.getContentReference(variable.attributes.id);
        } else if (variable.tag) {
            result = this.parse.call(this, variable, true);
        }
        return result;
    };

    Snap2Js.parseInitialVariables = function(vars) {
        var context = {},
            variable,
            name;

        vars = vars || [];
        for (var i = vars.length; i--;) {
            variable = vars[i];
            name = utils.sanitize(variable.attributes.name);
            context[name] = this.parseVariableValue(variable.children[0]);
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
            variables: this.parseInitialVariables(model.childNamed('variables').children),
            scripts: this.parseSpriteScripts(model.childNamed('scripts')),
            customBlocks: blocks.map(block => this.parseBlockDefinition(block)),
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
            customBlocks: blocks.map(block => this.parseBlockDefinition(block)),
            scripts: this.parseSpriteScripts(model.childNamed('scripts')),
            width: model.attributes.width,
            height: model.attributes.height,
            name: model.attributes.name
        };
    };

    const DEFAULT_BLOCK_FN_TYPE = 'reifyScript';
    Snap2Js.parseBlockDefinition = function(block) {
        var spec = block.attributes.s,
            inputs = utils.inputNames(spec).map(input => this.createAstNode(input)),
            blockType = block.attributes.type,
            inputTypes,
            blockFnType,
            name,
            root;

        const scriptNode = block.childNamed('script');
        const ast = scriptNode ? this.parseScript(scriptNode) :
            {  // Add a string node as a sort of no-op
                type: 'string',
                value: 'nop'
            };

        // Detect the fn to use to define the function
        blockFnType = 'reify' + blockType.substring(0,1).toUpperCase() +
            blockType.substring(1);

        if (!this._backend[blockFnType]) {
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
            code: this.generateCode(root)
        };
    };

    const DEFAULT_STATE = {
        sprites: [],
        stage: {
            name: 'Stage',
            customBlocks: [],
            scripts: {}
        },
        variables: {},
        customBlocks: [],
        returnValue: null,
        references: [],
        initRefs: '',
        initCode: '',
        tempo: 60
    };

    Snap2Js.parse = function(element, isVariable) {
        let type = element.tag;

        if (this.parse[type]) {
            return this.parse[type].call(this, element, isVariable);
        } else {
            throw new Error(`Unsupported xml type: ${type}`);
        }
    };

    Snap2Js.parse.ref = function(element) {
        return this.parse(element.target);
    };

    Snap2Js.parse.sound =
    Snap2Js.parse.costume =
    Snap2Js.parse.media = function(element) {
        // nop - ignore media for now
    };

    Snap2Js.parse.project = function(element) {
        var stage = element.childNamed('stage');
        this.parse(stage);

        var globalVars = this.parseInitialVariables(element.childNamed('variables').children);
        var blocks = element.childNamed('blocks').children;

        this.state.variables = globalVars;
        this.state.customBlocks = blocks.map(block => this.parseBlockDefinition(block));
    };

    Snap2Js.parse.stage = function(stage) {
        var sprites = stage.childNamed('sprites').childrenNamed('sprite');
        sprites.forEach(sprite => this.parse(sprite));

        var tempo = +stage.attributes.tempo;

        this.state.tempo = tempo;
        this.state.stage = this.parseStage(stage);
    };

    Snap2Js.parse.sprite = function(element) {
        // only add if the sprite hasn't already been parsed
        let name = element.attributes.name;
        let sprite = this.state.sprites.find(sprite => sprite.name === name);
        if (!sprite) {
            this.state.sprites.push(this.parseSprite(element));
        } else {
            console.error(`Sprite ${name} already parsed. Skipping...`);
        }
    };

    Snap2Js.parse.context = function(element, isVariable) {
        let receiver = null;
        if (element.childNamed('receiver')) {  // create the context
            receiver = element.childNamed('receiver').children[0];
            if (receiver.tag === 'ref') receiver = receiver.target;
            this.parse(receiver);
        }

        // Add the execution code
        let block = element.children[2];
        let fnNode = null;
        let node = null;
        if (block.tag === 'script') {
            fnNode = this.parseScript(block);
            let inputEls = element.childNamed('inputs').children;
            let inputNodes = inputEls.map(item => this.createAstNode(item.contents));
            node = {
                type: 'reifyScript',
                inputs: [fnNode, {type: 'list', inputs: inputNodes}]
            };
            node.inputs.forEach(input => input.parent = node);
        } else {
            fnNode = this.createAstNode(block);
            let inputEls = element.childNamed('inputs').children;
            let inputNodes = inputEls.map(item => this.createAstNode(item.contents));
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

        let body = `return ${this.generateCode(node)}`;

        // TODO: set the 'self' and '__CONTEXT' variables
        // TODO: move this code to the backend...
        if (receiver && receiver.tag === 'sprite') {
            let name = utils.sanitize(receiver.attributes.name);
            body = `let self = project.sprites.find(sprite => sprite.name === ${name});\n` +
                `let __CONTEXT = new VariableFrame(self.variables);\n` +
                `${body}`;
        } else {
            body = `let self = project.stage;\n` +
                `let __CONTEXT = new VariableFrame(self.variables);\n` +
                `${body}`;
        }

        let fn = new Function(body);
        let code = `(${fn.toString()})()`;
        if (!isVariable) {
            this.state.returnValue = code;
        }
        return code;
    };

    Snap2Js.transpile = function(xml, pretty=false) {
        let fn = this.compile(xml)
        let code = fn.toString();
        if (pretty) {
            code = prettier.format(fn.toString());
        }
        return code;
    };

    Snap2Js._resolveRefs = function(elements) {
        let refValues = {},
            allChildren = [],
            refs = [];

        for (let i = elements.length; i--;) {
            allChildren = allChildren.concat(elements[i].allChildren());
        }

        // For each of the references, record it in the REFERENCES obj.
        // Lists should be created by making an empty list to start and then modifying it
        for (let i = allChildren.length; i--;) {
            if (allChildren[i].tag === 'ref') {
                refs.push(allChildren[i]);
            } else if (allChildren[i].attributes.id) {
                if (allChildren[i].tag !== 'event') {
                    this.recordContentReference(allChildren[i]);
                }
                refValues[allChildren[i].attributes.id] = allChildren[i];
            }
        }

        for (let i = refs.length; i--;) {
            let id = refs[i].attributes.id;
            refs[i].target = refValues[id];
        }

        // Create the initialization code for the references
        this.state.initRefs = this.getInitRefs();
        return elements;
    };

    Snap2Js.getInitRefs = function() {
        return this.state.references
            .map((ref, i) => this.getInitRefCodeFor(ref, i))
            .join('\n');
    };

    Snap2Js.getInitRefCodeFor = function(ref, index) {
        const name = `${Snap2Js.REFERENCE_DICT}[${index}]`;
        let content = `'0'`;

        // Stage, sprites should look up the sprite/stage from the project
        if (ref.tag === 'stage') {
            content = 'project.stage';
        } else if (ref.tag === 'sprite') {
            const spriteName = utils.sanitize(ref.attributes.name);
            content = `project.sprites.find(sprite => sprite.name === ${spriteName})`;
        } else if (ref.tag === 'list') {  // lists may self-reference
            let initCode = [`${name} = [];`];
            initCode = initCode.concat(ref.children
                .map(child => this.parseVariableValue(child.children[0]))
                .map((content, i) => `${name}[${i}] = ${content};`));
            return initCode.join('\n');
        } else {
            console.error(`unknown xml tag for reference: ${ref.tag}`);
        }
        return `${name} = ${content};`;
    };

    Snap2Js.resetState = function() {
        this.state = _.merge({}, DEFAULT_STATE);
    };

    Snap2Js.compile = function(xml) {
        var endIndex = 0,
            startIndex = 0,
            len = xml.length,
            elements = [],
            element;

        xml = `<root>${xml.toString()}</root>`;
        element = new XML_Element();
        element.parseString(xml);
        elements = element.children;

        this._resolveRefs(elements);
        // Compile all the text...
        for (let i = elements.length; i--;) {
            this.parse(elements[i]);
        }
        let body = this.generateCodeFromState(this.state);
        let fn = new Function('__ENV', body);

        this.resetState();
        return fn;
    };

    Snap2Js.generateCodeFromState = function(state) {
        // Sanitize all user entered values
        this.state.stage.name = utils.sanitize(this.state.stage.name);

        this.state.stage.customBlocks.forEach(block => block.name = utils.sanitize(block.name))
        this.state.customBlocks.forEach(block => block.name = utils.sanitize(block.name))

        this.state.sprites.forEach(sprite => {
            sprite.name = utils.sanitize(sprite.name);
            sprite.customBlocks.forEach(block => utils.sanitize(block.name));
        });
        return boilerplateTpl(this.state);
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
            cond = event === utils.sanitize(`any message`) ? 'true' : `event === ${event}`;
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
        if (!root) return `SPromise.resolve()`;
        if (!Snap2Js._backend[root.type]) {
            throw new Error(`Unsupported node type: ${root.type}`);
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
    Snap2Js.CONTEXT.NOP = 'nop';
    Snap2Js.CONTEXT.DEFAULT = 'basic';

    Snap2Js._contexts = {};

    Snap2Js._contexts.basic = DefaultContext;
    Snap2Js._contexts.nop = require('./src/context/nop');

    Snap2Js.addContext = (type, context) => Snap2Js._contexts[type] = context;
    Snap2Js.newContext = type => _.cloneDeep(Snap2Js._contexts[type || Snap2Js.CONTEXT.DEFAULT]);
    Snap2Js.resetState();

})(module.exports);
