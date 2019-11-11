const GenericNode = require('../lib/snap/node');
const assert = require('assert');
const utils = require('./utils');

const SKIP_SNAP_TAGS = ['receiver', 'comment'];
const INVALID_SNAP_TAGS = ['receiver'];
const FLATTEN_SNAP_TAGS = ['autolambda', 'item'];
const FN_TYPES = ['context', 'reifyScript'];
const ASYNC_TYPES = [
    'doWait',
    'doBroadcastAndWait',
    'doAsk',
    'doThinkFor',
    'doSayFor'
];
const FN_EVAL = ['evaluateCustomBlock', 'reportCallCC', 'evaluate'];
class Node extends GenericNode {
    constructor(id) {
        super();
        this.id = (id || `id_${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '_');
    }

    addChild(child) {
        assert(child instanceof Node, `Child is not Node: ${child}`);
        if (this.id === 'item_377' && this.children.length > 2) {
            throw new Error('adding child to reifyPredicate');
        }
        super.addChild(child);
    }

    first() {
        return this.children[0];
    }

    inputs() {
        return this.children.slice();
    }

    inputsAsCode(backend) {
        return this.inputs().map(input => input.code(backend));
    }

    next() {
        if (!this.parent) {
            return null;
        }
        const myIndex = this.parent.children.indexOf(this);
        return this.parent.children[myIndex + 1];
    }

    previous() {
        if (!this.parent) {
            return null;
        }
        const myIndex = this.parent.children.indexOf(this);
        return this.parent.children[myIndex - 1];
    }

    prepare(blockDefinitions={}, allowWarp=true) {
        this.simplify(allowWarp);
        this.addConcurrencyNodes();
        this.addBlockDefinitions(blockDefinitions);
        this.finalize();
    }

    simplify(allowWarp) {
        this.children.forEach(node => node.simplify(allowWarp));
    }

    addConcurrencyNodes() {
        this.children.forEach(node => node.addConcurrencyNodes());
    }

    /**
     * Final method call before code generation.
     */
    finalize() {
        this.children.forEach(node => node.finalize());
    }

    addBlockDefinitions(definitions) {
        this.children.forEach(node => node.addBlockDefinitions(definitions));
    }

    code(backend) {
        throw new Error(`code not implemented for ${this.constructor.name}`);
    }

    static from(xmlElement) {
        const {attributes, tag} = xmlElement;
        if (tag === 'ref') {
            return Node.from(xmlElement.target);
        }
        assert(attributes, `Element does not have attributes: ${xmlElement}`);
        if (SKIP_SNAP_TAGS.includes(tag)) {
            return null;
        } else if (FLATTEN_SNAP_TAGS.includes(tag)) {
            assert.equal(xmlElement.children.length, 1, 'Cannot flatten node w/ multiple children.');
            return Node.from(xmlElement.children[0]);
        }

        let block;
        if (tag === 'script') {
            block = new Block();
        } else if (xmlElement.tag === 'context') {
            // TODO
            block = Node.fromContext(xmlElement);
        } else if (xmlElement.tag === 'custom-block') {
            const value = attributes.s;
            const id = attributes.collabId;
            block = new CallCustomFunction(id, value);
            // remove receiver if not a global block
            // FIXME: This should actually load the definitions from the receiver
            //let lastChild = curr.children[curr.children.length-1];
            //if (lastChild && lastChild.tag === 'receiver') {
                //let receiver = lastChild.children[0];
                //curr.children.pop();
                //if (receiver) {
                    //this.parse(receiver);
                //}
            //}
        } else if (attributes.var) {
            block = new Variable(attributes.var);
        } else if (xmlElement.tag === 'block') {
            block = new BuiltIn(attributes.collabId, attributes.s);
        } else if (xmlElement.contents) {
            const type = xmlElement.tag === 'l' ?
                typeof xmlElement.contents : xmlElement.tag;
            block = new Primitive(type, xmlElement.contents);
        } else if (tag === 'l') {
            block = new EmptyNode();
        } else {
            const type = attributes.s || xmlElement.tag;
            const id = attributes.collabId;
            block = new BuiltIn(id, type);
        }

        for (let i = 0; i < xmlElement.children.length; i++) {
            const childTag = xmlElement.children[i].tag;
            const child = Node.from(xmlElement.children[i]);
            if (child !== null) {
                block.addChild(child);
            }
        }

        return block;
    }

    static fromContext(element) {
        let receiver = null;
        const receiverNode = element.childNamed('receiver');
        if (receiverNode && receiverNode.children.length) {  // create the context
            receiver = receiverNode.children[0];
            if (receiver.tag === 'ref') receiver = receiver.target;
            //this.parse(receiver);
        }

        // Add the execution code
        const [inputs, variables, fnBody] = element.children;
        // FIXME: How is "variables" used???
        // Could this be used to store variables captured from the closure?
        const type = fnBody.tag === 'script' ? 'reifyScript' : 'reifyReporter';
        const node = new BuiltIn(null, type);  // TODO: Make these custom types?
        //const fnNode = this.createAstNode(fnBody);
        const fnNode = Node.from(fnBody);
        if (fnNode) {
            node.addChild(fnNode);
        } else {
            node.addChild(new Block());
        }
        //const inputNodes = inputs.children.map(item => this.createAstNode(item.contents));
        const inputNodes = inputs.children.map(item => Node.fromPrimitive(item.contents));
        const inputList = new BuiltIn(null, 'list');  // TODO: Make custom types?
        inputNodes.forEach(node => inputList.addChild(node));
        node.addChild(inputList);

        node.simplify();

        // TODO: Should this use reportObject?
        const receiverName = receiver && receiver.tag === 'sprite' ?
            receiver.attributes.name : null;
        const context = new BoundFunction(receiverName);
        context.addChild(node);

        return context;
    }

    static fromPrimitive(primitive) {
        return new Primitive('string', primitive);
    }
}

class Block extends Node {
    constructor() {
        super();
    }

    code(backend) {
        const topBlock = this.first();
        const handlerType = topBlock && topBlock.type;
        const isEventHandler = !!backend.eventHandlers[handlerType];
        if (isEventHandler) {
            const code = this.children.slice(1)
                .map(child => child.code(backend))
                .join('\n');

            return backend.eventHandlers[handlerType].call(backend, topBlock, code);
        } else {
            const code = this.inputs()
                .map(child => child.code(backend))
                .join('\n');

            return `{\n${code}\n}`;  // FIXME: Move this to the backend?
        }
    }
    
    isAsync() {
        return !!this.children.find(child => child.isAsync());
    }
}

// It might be better to make a type for 'block's and then add
// a method for isStatement() or something...
class BuiltIn extends Node {  // FIXME: Not the best 
    constructor(id, type) {
        super(id);
        this.type = type;
        assert(!['ref', 'stage', 'project', 'event'].includes(this.type), `Invalid BuiltIn type: ${this.type}`);
    }

    isStatement() {
        // FIXME: It may be better to assume that it isn't a statement...
        return !EXPRESSION_TYPES.includes(this.type);
    }

    isAsync() {
        if (ASYNC_TYPES.includes(this.type)) {
            // doWait can be sync if duration == 0 and in warp block
            const isWarping = this.isContainedIn('doWarp');
            if (isWarping && this.type === 'doWait') {
                return parseFloat(this.first().value) !== 0;
            }
            return true;
        } else if (FN_EVAL.includes(this.type)) {
            return !!this.children.find(child => child.isAsync());
        } else if (this.type === 'context') {
            return this.children[0].isAsync();
        }

        const children = this.children
            .filter(child => !FN_TYPES.includes(child.type));

        return !!children.find(child => child.isAsync());
    }

    isContainedIn(type) {
        let parent = this.parent;
        while (parent) {
            if (parent.type === type) {
                return true;
            }
            parent = parent.parent;
        }
        return false;
    }

    simplify(allowWarp=true) {
        super.simplify(allowWarp);

        // Convert all reifyPredicate/reifyReporter to reifyScript's
        const isImplicitReturnFn = ['reifyReporter', 'reifyPredicate'].includes(this.type);
        if (isImplicitReturnFn) {
            const body = new Block();
            const doReport = new BuiltIn(null, 'doReport');
            doReport.addChild(this.first());
            body.addChild(doReport);
            if (this.children.length !== 2) {
                console.log(this);
            }
            assert(this.children.length === 2, `Expected 2 children for ${this.type}. Found ${this.children.length}`);
            this.children[0] = body;
            this.type = 'reifyScript';
        }

        if (!allowWarp && this.type === 'doWarp') {
            this.type = 'doRepeat';
            const count = new Primitive('string', '1');
            this.addChildFirst(count);
        }
    }

    finalize() {
        if (this.type === 'doWarp') {
            this.type = 'doRepeat';
            const count = new Primitive('string', '1');
            this.addChildFirst(count);
        }
        super.finalize();
    }

    addConcurrencyNodes() {
        super.addConcurrencyNodes();
        const isLoop = ['doRepeat', 'doForever', 'doUntil'].includes(this.type);

        if (isLoop) {
            const isWarping = this.isContainedIn('doWarp');
            if (!isWarping) {
                const body = this.inputs().pop();
                body.addChild(new Yield());
            }
        }
    }

    code(backend) {
        if (!backend[this.type]) {
            throw new Error(`Backend does not support builtin: ${this.type}`);
        }

        const suffix = this.isStatement() ? ';' : '';
        const prefix = this.getCodePrefix();
        return prefix + backend[this.type](this) + suffix;
    }

    getCodePrefix() {  // TODO: Should this be moved to the backend?
        const isControlFlow = ['doRepeat', 'doForever', 'doUntil', 'doIf', 'doIfElse'].includes(this.type);
        if (!this.isAsync() || isControlFlow) {
            return '';
        }

        if (this.type.startsWith('reify') || this.type === 'context') {
            return 'async ';
        }

        return 'await ';
    }
}

class Primitive extends BuiltIn {
    constructor(type, value) {
        super(undefined, type);
        this.value = value;
    }
}

class Yield extends BuiltIn {
    constructor() {
        super(undefined, 'doYield');
    }

    isStatement() {
        return false;
    }

    isAsync() {
        return true;
    }
}

class EmptyNode extends BuiltIn {
    constructor() {
        super();
    }

    code(backend) {
        if (!this.parent) {
            return (new EmptyString()).code(backend);
        }

        const parentType = this.parent.type;
        if (!DEFAULT_INPUTS[parentType]) {
            throw new Error(`Default values unknown for ${parentType}`);
        }
        const inputs = DEFAULT_INPUTS[parentType]();
        const index = this.parent.inputs().indexOf(this);
        return inputs[index].code(backend);
    }
}

class CallCustomFunction extends BuiltIn {
    constructor(id, name) {
        super(id, 'evaluateCustomBlock');
        this.name = name;

        this.definition = null;
    }

    addChild(node) {
        const type = this.getChildType(this.children.length);
        if (type === 'cs') {  // Make the implicit fn explicit
            const reifyScript = new BuiltIn(null, 'reifyScript');
            reifyScript.addChild(node);
            reifyScript.addChild(new EmptyNode());
            node = reifyScript;
        }

        super.addChild(node);
    }

    getChildType(index) {
        return utils.inputNames(this.name)[index];
    }

    isAsync() {
        const inRecursiveStep = this.allParents().includes(this.definition);
        if (inRecursiveStep) {
            return false;
        }

        if (!this.definition) {
            const parents = this.allParents();
        }
        assert(this.definition, `No definition found for ${this.name}`);
        return this.definition.isAsync();
    }

    addBlockDefinitions(defs) {
        super.addBlockDefinitions(defs);
        this.definition = defs[this.name];

        if (!this.definition) {
            throw new Error(`Missing block definition for ${this.name}`);
        }
    }
}

/**
 * Function bound to a given sprite or stage
 */
class BoundFunction extends BuiltIn {
    constructor(receiverName) {
        super(null, 'context');
        this.receiver = receiverName;
    }
}

class Variable extends BuiltIn {
    constructor(value) {
        super();
        this.value = value;
        this.type = 'variable';
    }
}

class False extends Primitive {
    constructor() {
        super('bool', 'false');
    }
}

class EmptyString extends Primitive {
    constructor() {
        super('string', '');
    }
}

class List extends Primitive {
    constructor() {
        super('list');
    }
}

const DEFAULT_INPUTS = {
    doIf: () => [new False(), new Block()],
    forward: () => [new EmptyString()],
    list: () => [new EmptyString()],
    reportJSFunction: () => [new List(), new Block()],
    getJSFromRPCStruct: () => [...new Array(10)].map(_ => new EmptyString()),
    reifyScript: () => [new Block(), new List()],
    reportListItem: () => [new EmptyString(), new List()],
    reportCDR: () => [new List()],
    doReport: () => [new EmptyString()],
    reportModulus: () => [new EmptyString(), new EmptyString()],
    reportSum: () => [new EmptyString(), new EmptyString()],
    reportEquals: () => [new False(), new False()],
    reportTextSplit: () => [new EmptyString(), new EmptyString()],
    doHideVar: () => [new EmptyString()],
    doStopThis: () => [new EmptyString()],
    reportIsA: () => [new EmptyString(), new EmptyString()],
    reportBoolean: () => [new False()],
    reportDate: () => [new EmptyString()],
    receiveKey: () => [new EmptyString()],
};

const EXPRESSION_TYPES = [
    'context',
    'xPosition',
    'direction',
    'yPosition',
    'reportCallCC',
    'evaluate',
    'getCostumeIdx',
    'getScale',
    'reportTouchingObject',
    'reportTouchingColor',
    'reportDate',
    'reportURL',
    'reportGet',
    'reportColorIsTouchingColor',
    'reportAttributeOf',
    'reportIsFastTracking',
    'getTimer',
    'reportMouseX',
    'reportMouseY',
    'reportMouseDown',
    'getLastAnswer',
    'reportKeyPressed',
    'reportDistanceTo',
    'getTempo',
    'reportMonadic',
    'reportModulus',
    'reportQuotient',
    'reportProduct',
    'reportDifference',
    'reportRandom',
    'reportSum',
    'reportRound',
    'reportIsIdentical',
    'reportIsA',
    'reportAnd',
    'reportOr',
    'reportTextSplit',
    'reportGreaterThan',
    'reportLessThan',
    'reportEquals',
    'reportJoinWords',
    'reportNot',
    'reportStringSize',
    'reportBoolean',
    'reportJSFunction',
    'reifyScript',
    'reifyReporter',
    'reifyPredicate',
    'reportListLength',
    'reportListItem',
    'reportCDR',
    'reportNewList',
    'reportListContainsItem',
    'reportCONS',
    'variable',
    'evaluateCustomBlock',
    'string',
    'option',
    'color',
    'bool',
    'list',
    'getJSFromRPCStruct',
    'reportObject',
];

module.exports = {
    Node,
    Block,
    BuiltIn,
    Primitive,
    BoundFunction,
    EXPRESSION_TYPES,
    SKIP_SNAP_TAGS,
    EmptyNode,
    Variable,
    List,
    ASYNC_TYPES,
};
