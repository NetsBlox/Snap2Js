const Node = require('../lib/snap/node');
const assert = require('assert');
const utils = require('./utils');

const SKIP_SNAP_TAGS = ['receiver', 'comment'];
const INVALID_SNAP_TAGS = ['receiver'];
const FLATTEN_SNAP_TAGS = ['autolambda'];
const ASYNC_TYPES = [
    'doWait',
    'doBroadcastAndWait',
    'doAsk',
    'doThinkFor',
    'doSayFor'
];
class AstNode extends Node {
    constructor(id) {
        super();
        this.id = (id || `id_${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '_');
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
    }

    simplify(allowWarp) {
        this.children.forEach(node => node.simplify(allowWarp));
    }

    addConcurrencyNodes() {
        this.children.forEach(node => node.addConcurrencyNodes());
    }

    addBlockDefinitions(definitions) {
        this.children.forEach(node => node.addBlockDefinitions(definitions));
    }

    code(backend) {
        throw new Error(`code not implemented for ${this.constructor.name}`);
    }

    isAsync() {
        return !!this.children.find(child => child.isAsync());
    }

    static from(xmlElement) {
        const {attributes, tag} = xmlElement;
        if (SKIP_SNAP_TAGS.includes(tag)) {
            return null;
        } else if (FLATTEN_SNAP_TAGS.includes(tag)) {
            assert.equal(xmlElement.children.length, 1, 'Cannot flatten node w/ multiple children.');
            return AstNode.from(xmlElement.children[0]);
        }

        let block;
        if (tag === 'script') {
            block = new Block();
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

        //for (let i = 0; i < xmlElement.children.length; i++) {
            //const childTag = xmlElement.children[i].tag;
            //if (SKIP_SNAP_TAGS.includes(childTag)) {
                //continue;
            //}
            //const node = AstNode.from(xmlElement.children[i]);
            //block.addChild(node);
        //}

        return block;
    }

    static fromPrimitive(primitive) {
        return new Primitive(typeof primitive, primitive);
    }
}

class Block extends AstNode {
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
}

// It might be better to make a type for 'block's and then add
// a method for isStatement() or something...
class BuiltIn extends AstNode {  // FIXME: Not the best 
    constructor(id, type) {
        super(id);
        this.type = type;
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
        }
        return super.isAsync();
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
            assert(this.children.length === 2, `Expected 2 child for ${this.type}. Found ${this.children.length}`);
            this.children[0] = body;
            this.type = 'reifyScript';
        }

        if (!allowWarp && this.type === 'doWarp') {
            this.type = 'doRepeat';
            const count = new Primitive('string', '1');
            this.addChildFirst(count);
        }
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

    getCodePrefix() {
        // TODO: Should this check use the backend?
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
        const parentType = this.parent.type;
        if (!DEFAULT_INPUTS[parentType]) {
            console.log(this.parent);
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

class EmptyList extends Primitive {
    constructor() {
        super('list');
    }
}

const DEFAULT_INPUTS = {
    doIf: () => [new False(), new Block()],
    forward: () => [new EmptyString()],
    list: () => [new EmptyString()],
    reportJSFunction: () => [new EmptyList(), new Block()],
    getJSFromRPCStruct: () => [...new Array(10)].map(_ => new EmptyString()),
    reifyScript: () => [new Block(), new EmptyList()],
    reportListItem: () => [new EmptyString(), new EmptyList()],
    reportCDR: () => [new EmptyList()],
    doReport: () => [new EmptyString()],
    reportModulus: () => [new EmptyString(), new EmptyString()],
    reportSum: () => [new EmptyString(), new EmptyString()],
    reportEquals: () => [new False(), new False()],
    reportTextSplit: () => [new EmptyString(), new EmptyString()],
    doHideVar: () => [new EmptyString()],
    doStopThis: () => [new EmptyString()],
    reportIsA: () => [new EmptyString(), new EmptyString()],
    reportBoolean: () => [new False()],
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
];

module.exports.AstNode = AstNode;
module.exports.Block = Block;
module.exports.BuiltIn = BuiltIn;
module.exports.Primitive = Primitive;
module.exports.BoundFunction = BoundFunction;
module.exports.EXPRESSION_TYPES = EXPRESSION_TYPES;
module.exports.SKIP_SNAP_TAGS = SKIP_SNAP_TAGS;
