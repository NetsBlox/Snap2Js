// We will be generating JavaScript code which will call the primitive fns
(function(Snap2Js) {
    const assert = require('assert');
    const XML_Element = require('./lib/snap/xml');
    const AST = require('./src/ast');
    const {SKIP_SNAP_TAGS, Block, Yield, BuiltIn, BoundFunction} = AST;
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
        const validEventHandlers = Object.keys(this._backend.eventHandlers);
        const eventHandlers = {};
        const asts = model.children
            .filter(child => child.tag !== 'comment')
            .map(child => this.createAstNode(child));

        for (let i = asts.length; i--;) {
            const root = asts[i];
            assert(root instanceof AST.Node);

            const eventHandler = root instanceof Block ? root.first().type : root.type;
            if (validEventHandlers.includes(eventHandler)) {
                if (!eventHandlers[eventHandler]) {
                    eventHandlers[eventHandler] = [];
                }
                eventHandlers[eventHandler].push(root);
            }
        }
        return eventHandlers;
    };

    Snap2Js.createAstNode = function(element) {
        if (typeof element !== 'object') {
            return AST.Node.fromPrimitive(element);
        }
        if (element.tag === 'ref') element = element.target;

        if (SKIP_SNAP_TAGS.includes(element.tag)) {
            return null;
        }

        const node = this.getNodeForObject(element) || AST.Node.from(element);

        return node;
    };

    Snap2Js.getNodeForObject = function(element) {
        const OBJECT_TAGS = ['sprite', 'stage'];
        if (OBJECT_TAGS.includes(element.tag)) {
            const node = new BuiltIn(element.attributes.id, 'reportObject');
            const name = AST.Node.fromPrimitive(element.attributes.name);
            node.addChild(name);
            return node;
        }
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
            const node = new BuiltIn(null, 'reportListItem');
            node.addChild(AST.Node.fromPrimitive(index + 1));
            node.addChild(new AST.Variable(Snap2Js.REFERENCE_DICT));
            return node;
        }
        return new AST.EmptyNode();
    };

    Snap2Js.recordContentReference = function(element) {
        const {id} = element.attributes;
        const index = this.getReferenceIndex(id);
        if (index === -1) {
            this.state.references.push(element);
        }
    };

    Snap2Js.parseVariableValue = function(variable) {
        if (variable.attributes.isReferenced) {  // FIXME
            return this.getContentReference(variable.attributes.id);
        } else if (variable.tag === 'context') {  // FIXME: Is this necessary?
            return this.parse.call(this, variable, true);
        } else if (variable.tag === 'ref') {
            //return this.parseVariableValue(variable.target);
            return this.getContentReference(variable.attributes.id);
        } else if (variable.tag === 'list') {
            const list = new AST.List();
            variable.children
                .map(child => this.parseVariableValue(child.children[0]))
                .forEach(item => list.addChild(item));

            return list;
        } else {
            return this.createAstNode(variable);
        }
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
        const variables = this.parseInitialVariables(model.childNamed('variables').children);
        return {
            id: model.attributes.collabId,
            name: model.attributes.name,
            customBlocks: blocks.map(block => this.parseBlockDefinition(block)),
            variables: variables,
            scripts: [],
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
            variables: this.parseInitialVariables(model.childNamed('variables').children),
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
            blockType = block.attributes.type;

        // TODO: Compile a special warping version, if needed, and regular version...
        const scriptNode = block.childNamed('script');
        const ast = scriptNode ? this.createAstNode(scriptNode) : new AST.EmptyNode();

        // Detect the fn to use to define the function
        let blockFnType = 'reify' + blockType.substring(0,1).toUpperCase() +
            blockType.substring(1);

        if (!this._backend[blockFnType]) {
            blockFnType = DEFAULT_BLOCK_FN_TYPE;
        }

        // parse the inputs to make the block def name
        const inputTypes = block.childNamed('inputs').children
            .map(child => child.attributes.type);

        const name = utils.parseSpec(spec).map(part => {
            if (part[0] === '%' && part.length > 1) {
                return inputTypes.shift();
            }
            return part;
        }).join(' ');

        // Modify the ast to get it to generate an entire fn
        const root = new BuiltIn(block.attributes.collabId, 'reifyScript');  // TODO: Make these custom types?
        root.addChild(ast);
        const inputList = new BuiltIn(null, 'list');  // TODO: Make custom types?
        inputs.forEach(input => inputList.addChild(input));
        root.addChild(inputList);

        return {
            name: name,
            ast: root,
        };
    };

    const DEFAULT_STATE = {
        sprites: [],
        stage: {
            name: 'Stage',
            customBlocks: [],
            scripts: {},
            variables: {},
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
        const globalVars = this.parseInitialVariables(element.childNamed('variables').children);
        const blocks = element.childNamed('blocks').children;

        this.state.variables = globalVars;
        this.state.customBlocks = blocks.map(block => this.parseBlockDefinition(block));

        const stage = element.childNamed('stage');
        this.parse(stage);
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
            sprite = this.parseSprite(element);
            this.state.sprites.push(sprite);
            sprite.scripts = this.parseSpriteScripts(element.childNamed('scripts'));
        } else {
            console.error(`Sprite ${name} already parsed. Skipping...`);
        }
    };

    Snap2Js.parse.context = function(element, isVariable) {
        return AST.Node.from(element);
        let receiver = null;
        const receiverNode = element.childNamed('receiver');
        if (receiverNode && receiverNode.children.length) {  // create the context
            receiver = receiverNode.children[0];
            if (receiver.tag === 'ref') receiver = receiver.target;
            this.parse(receiver);
        }

        // Add the execution code
        const [inputs, variables, fnBody] = element.children;
        // FIXME: How is "variables" used???
        // Could this be used to store variables captured from the closure?
        const type = fnBody.tag === 'script' ? 'reifyScript' : 'reifyReporter';
        const node = new BuiltIn(null, type);  // TODO: Make these custom types?
        const fnNode = this.createAstNode(fnBody);
        if (fnNode) {
            node.addChild(fnNode);
        } else {
            node.addChild(new Block());
        }
        const inputNodes = inputs.children.map(item => this.createAstNode(item.contents));
        const inputList = new BuiltIn(null, 'list');  // TODO: Make custom types?
        inputNodes.forEach(node => inputList.addChild(node));
        node.addChild(inputList);

        node.simplify();

        const receiverName = receiver && receiver.tag === 'sprite' ?
            receiver.attributes.name : null;
        const context = new BoundFunction(receiverName);
        context.addChild(node);

        return context;
    };

    Snap2Js.transpile = function(xml, pretty=false, options) {
        const fn = this.compile(xml, options);
        let code = fn.toString();
        if (pretty) {
            code = prettier.format(fn.toString());
        }
        return code;
    };

    Snap2Js.resolveReferences = function(elements) {
        let allChildren = [];

        for (let i = elements.length; i--;) {
            allChildren = allChildren.concat(elements[i].allChildren());
        }

        const refNodes = allChildren.filter(child => child.tag === 'ref');

        for (let i = allChildren.length; i--;) {
            const child = allChildren[i];
            const {id} = child.attributes;
            const isNotReference = child.tag !== 'ref';
            if (isNotReference && id) {
                const references = refNodes.filter(ref => ref.attributes.id === id);
                if (references.length) {
                    child.attributes.isReferenced = true;
                    this.recordContentReference(child);
                    references.forEach(ref => ref.target = child);
                }
            }
        }

        refNodes.forEach(ref => {
            assert(ref.target, `Did not find target for reference: ${ref.attributes.id}`)
        });

        return refNodes;
    };

    Snap2Js.getSerializedReference = function(value, index) {
        // TODO: If it
        const name = `${Snap2Js.REFERENCE_DICT}[${index}]`;
        let content = `'0'`;

        if (value instanceof AST.Node) {
            content = this.generateCode(value)
        } else if (value.tag === 'stage' || value.tag === 'sprite') {
            content = 'project.stage';
        } else if (value.tag === 'sprite') {
            const spriteName = utils.sanitize(value.attributes.name);
            content = `project.sprites.find(sprite => sprite.name === ${spriteName})`;
        } else if (value.tag === 'list') {  // lists may self-reference
            let initCode = [`${name} = [];`];
            initCode = initCode.concat(value.children
                .map(child => this.parseVariableValue(child.children[0]))
                .map((content, i) => `${name}[${i}] = ${content};`));
            return initCode.join('\n');
        } else {
            throw new Error(`Unexpected referenced content: ${value}`);
        }

        return `${name} = ${content};`;
    };

    Snap2Js.getReferencedValue = function(element, index) {
        const isList = element.tag === 'list';
        const content = isList ? new AST.List() :
            this.parseVariableValue(element);

        // Add to references list
        const addToReferences = new BuiltIn(null, 'doInsertInList');
        addToReferences.addChild(content);
        addToReferences.addChild(AST.Node.fromPrimitive(index + 1));
        addToReferences.addChild(new AST.Variable(Snap2Js.REFERENCE_DICT));

        const commands = [addToReferences];

        if (isList) {
            for (let i = 0; i < element.children.length; i++) {
                const unwrappedElement = element.children[i].children[0];
                const itemNode = this.parseVariableValue(unwrappedElement);

                const list = new BuiltIn(null, 'reportListItem');
                list.addChild(AST.Node.fromPrimitive(index + 1));
                list.addChild(new AST.Variable(Snap2Js.REFERENCE_DICT));

                const addToList = new BuiltIn(null, 'doAddToList');
                addToList.addChild(itemNode);
                addToList.addChild(list);
                commands.push(addToList);
            }
        }

        return commands;
    };

    Snap2Js.resetState = function() {
        this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    };

    const DEFAULT_OPTIONS = {
        allowWarp: true
    };
    Snap2Js.compile = function(xml, options=DEFAULT_OPTIONS) {
        var endIndex = 0,
            startIndex = 0,
            len = xml.length,
            elements = [],
            element;

        this.resetState();
        options = Object.assign({}, DEFAULT_OPTIONS, options);

        xml = `<root>${xml.toString()}</root>`;
        element = new XML_Element();
        element.parseString(xml);
        elements = element.children;
        this.resolveReferences(elements);

        element = this._flatten(element);
        if (elements[0].tag === 'context') {
            this.state.returnValue = this.parse(elements[0]);
            const receivers = elements[0].allChildren()
                .filter(child => child.tag === 'receiver')
                .map(node => node.children[0])
                .filter(node => !!node)
                .reduce((l1, l2) => l1.concat(l2), []);

            if (elements[1]) {
                receivers.push(elements[1]);
            }

            receivers.forEach(receiver => this.parse(receiver));
        } else {
            for (let i = 0; i < elements.length; i++) {
                this.parse(elements[i]);
            }
        }

        this.prepareSyntaxTrees(this.state, options.allowWarp);

        let body = this.generateCodeFromState(this.state);

        this.writeToDebugFile(body, elements[0].tag === 'context');  // REMOVE
        let fn = new Function('__ENV', body);

        return fn;
    };

    Snap2Js.writeToDebugFile = function(body, isContext) {
        const content = [
            'const fn = function (__ENV) {',
            body,
            '};',
            'async function test(){',
            isContext ? 
            'const f = await fn(require(\'.\').newContext());\nconsole.log(await f());' :
            'console.log(await fn(require(\'.\').newContext()))',
            '};',
            'test();',
        ].join('\n');
        fs.writeFileSync('code.js', content);
    };

    Snap2Js._flatten = function(node) {
        let children = [];

        for (let i = 0; i < node.children.length; i++) {
            let child = node.children[i];
            if (child.tag === 'l' && child.children.length === 1) {
                //if (child.children.length === 1) {
                    children.push(this._flatten(child.children[0]));
                //} else if (child.children.length) {
                    //console.log('children', children);
                    //children = children.concat(child.children
                        //.map(child => this._flatten(child)));
                //}
            } else if (child.tag === 'autolambda') {
                children.push(this._flatten(child.children[0]));
            } else {
                children.push(this._flatten(child));
            }
        }
        node.children = children;
        return node;
    };

    Snap2Js.prepareSyntaxTrees = function(state, allowWarp=true) {
        const customBlockDefs = {};
        this.state.customBlocks.forEach(def => customBlockDefs[def.name] = def.ast);
        this.state.customBlocks
            .forEach(def => def.ast.prepare(customBlockDefs, allowWarp));

        const spritesAndStage = this.state.sprites.concat([this.state.stage]);
        spritesAndStage.forEach(sprite => {
            // Create a customBlockDefs dict
            const localCustomDefs = Object.create(customBlockDefs);
            sprite.customBlocks.forEach(def => localCustomDefs[def.name] = def.ast);
            sprite.customBlocks
                .forEach(def => def.ast.prepare(localCustomDefs, allowWarp));

            const isReturningValueFromSprite = this.state.returnValue &&
                this.state.returnValue.receiver === sprite.name;

            if (isReturningValueFromSprite) {
                this.state.returnValue.prepare(localCustomDefs, allowWarp);
            }

            Object.values(sprite.scripts).forEach(trees => {
                trees.forEach(root => root.prepare(localCustomDefs, allowWarp));
            });


            Object.entries(sprite.variables).forEach(entry => {
                const [name, value] = entry;
                if (value instanceof AST.Node) {
                    value.prepare(localCustomDefs, allowWarp);
                    sprite.variables[name] = this.generateCode(value);
                }
            });
        });

        Object.entries(this.state.variables).forEach(entry => {
            const [name, value] = entry;
            if (value instanceof AST.Node) {
                value.prepare(customBlockDefs, allowWarp);
                this.state.variables[name] = this.generateCode(value);
            }
        });

        // FIXME: What custom block scope should I use for the references?
        this.state.references = this.state.references
            .map((reference, i) => this.getReferencedValue(reference, i))
            .reduce((l1, l2) => l1.concat(l2), []);

        // Define the REFERENCES object?
        //this.state.references.unshift();

        this.state.references
            .filter(reference => reference instanceof AST.Node)
            .forEach(reference => reference.prepare(customBlockDefs, allowWarp));

        //const isReturningValueFromStage = this.state.returnValue &&
            //!this.state.returnValue.receiver;
        //if (isReturningValueFromStage) {
        //}

    };

    Snap2Js.generateCodeFromState = function(state) {
        // Create the initialization code for the references
        this.state.initRefs = this.state.references
            .map(node => this.generateCode(node))
            //.map((ref, index) => this.getSerializedReference(ref, index))
            .join('\n');

        // Sanitize all user entered values
        const compileCustomBlock = block => {
            block.name = utils.sanitize(block.name);
            block.code = Snap2Js.generateCode(block.ast);
        };

        this.state.customBlocks.forEach(compileCustomBlock);

        const spritesAndStage = this.state.sprites.concat([this.state.stage]);
        spritesAndStage.forEach(sprite => {
            sprite.name = utils.sanitize(sprite.name);
            sprite.customBlocks.forEach(compileCustomBlock);
            const events = Object.keys(sprite.scripts);
            for (let i = 0; i < events.length; i++) {
                const trees = sprite.scripts[events[i]];
                sprite.scripts[events[i]] = trees.map(root => this.generateCode(root));
            }
        });

        if (this.state.returnValue) {
            this.state.returnValue = this.generateCode(this.state.returnValue);
        }
        return boilerplateTpl(this.state);
    };

    Snap2Js.generateCode = function(node) {
        if (!node.code) console.log('node is', node);
        return node.code(Snap2Js._backend) || '';
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
