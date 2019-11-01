// We will be generating JavaScript code which will call the primitive fns
(function(Snap2Js) {
    const assert = require('assert');
    const XML_Element = require('./lib/snap/xml');
    const {AstNode, Block, Yield, BuiltIn, BoundFunction} = require('./src/ast');
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
            .map(child => AstNode.from(child));

        for (let i = asts.length; i--;) {
            const root = asts[i];
            assert(root instanceof AstNode);

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

    Snap2Js.createAstNode = function(curr) {
        if (typeof curr !== 'object') {
            return AstNode.fromPrimitive(curr);
        }

        if (curr.tag === 'color' || curr.tag === 'option')
            return this.createAstNode(curr.contents)

        const node = AstNode.from(curr);

        // Load any additional definitions required for the node
        const receiver = curr.childNamed('receiver');
        if (receiver) {
            this.parse(receiver.children[0])
        }

        return node;
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
        // FIXME: Can this be made simpler?
        if (variable.tag === 'bool') {
            return variable.contents === 'true';
        } else if (variable.tag === 'l') {
            return utils.sanitize(variable.contents);
        } else if (variable.tag === 'list') {
            if (variable.attributes.id) {
                return this.getContentReference(variable.attributes.id);
            } else {  // unreferenced list literal
                return '[' + variable.children.map(child => {
                    return this.parseVariableValue(child.children[0]);
                }).join(',') + ']';
            }
        } else if (variable.tag === 'ref') {
            return this.getContentReference(variable.attributes.id);
        } else {
            return this.parse.call(this, variable, true);
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
            scripts: this.parseSpriteScripts(model.childNamed('scripts')),
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
        // TODO: Update this
        var spec = block.attributes.s,
            inputs = utils.inputNames(spec).map(input => this.createAstNode(input)),
            blockType = block.attributes.type,
            inputTypes,
            blockFnType,
            name,
            root;

        const scriptNode = block.childNamed('script');
        const ast = AstNode.from(scriptNode || '');

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
            this.state.sprites.push(this.parseSprite(element));
        } else {
            console.error(`Sprite ${name} already parsed. Skipping...`);
        }
    };

    Snap2Js.parse.context = function(element, isVariable) {
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
        node.addChild(fnNode);
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

        //const printScripts = () => {
            //const stage = element.children[0].children.find(c => c.tag === 'stage');
            //const sprite = stage.children.find(c => c.tag === 'sprites').children[0];
            //const script = sprite.children.find(c => c.tag === 'scripts').children[0];
            //// TODO: Find the scripts in the if statement
            //const evaluate = script.children[1].children[0].children[1];
        //};
        //printScripts();
        element = this._flatten(element);
        //printScripts();
        if (elements[0].tag === 'context') {
            this.state.returnValue = this.parse(elements.shift());
        }
        for (let i = 0; i < elements.length; i++) {
            this.parse(elements[i]);
        }
        //console.log('code:', this.state.sprites[0].scripts.receiveGo[0]);
        let body = this.generateCodeFromState(this.state);
        //console.log(body);
        require('fs').writeFileSync('code.js', `const fn = function (__ENV) {${body}};async function test(){console.log(await fn(require('.').newContext()))};test();`);
        let fn = new Function('__ENV', body);

        this.resetState();
        return fn;
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

    Snap2Js.generateCodeFromState = function(state) {
        const customBlockDefs = {};
        this.state.customBlocks.forEach(def => customBlockDefs[def.name] = def.ast);
        this.state.customBlocks.forEach(def => def.ast.prepare(customBlockDefs));

        const spritesAndStage = this.state.sprites.concat([this.state.stage]);
        spritesAndStage.forEach(sprite => {
            // Create a customBlockDefs dict
            const localCustomDefs = Object.create(customBlockDefs);
            sprite.customBlocks.forEach(def => localCustomDefs[def.name] = def.ast);
            sprite.customBlocks.forEach(def => def.ast.prepare(localCustomDefs));

            const isReturningValueFromSprite = this.state.returnValue &&
                this.state.returnValue.receiver === sprite.name;

            if (isReturningValueFromSprite) {
                this.state.returnValue.prepare(localCustomDefs);
            }

            const trees = Object.values(sprite.scripts)
                .reduce((l1, l2) => l1.concat(l2), []);

            Object.values(sprite.scripts).forEach(trees => {
                trees.forEach(root => root.prepare(localCustomDefs));
            });


            Object.entries(sprite.variables).forEach(entry => {
                const [name, value] = entry;
                if (value instanceof AstNode) {
                    value.prepare(localCustomDefs);
                    sprite.variables[name] = this.generateCode(value);
                }
            });
        });

        Object.entries(this.state.variables).forEach(entry => {
            const [name, value] = entry;
            if (value instanceof AstNode) {
                value.prepare(customBlockDefs);
                this.state.variables[name] = this.generateCode(value);
            }
        });

        // FIXME:
        //const isReturningValueFromStage = this.state.returnValue &&
            //!this.state.returnValue.receiver;
        //if (isReturningValueFromStage) {
        //}

        // Sanitize all user entered values
        const compileCustomBlock = block => {
            block.name = utils.sanitize(block.name);
            block.code = Snap2Js.generateCode(block.ast);
        };

        this.state.stage.name = utils.sanitize(this.state.stage.name);

        this.state.customBlocks.forEach(compileCustomBlock);

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

        var code = Snap2Js._backend[root.type].call(Snap2Js, root);
        if (!Snap2Js._backend[root.type].async && root.next) {
            // FIXME: UPDATE
            code += `\n.then(() => ${Snap2Js.generateCode(root.next())})`;
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
