const Node = require('../lib/snap/node');
const assert = require('assert');

const SKIP_SNAP_TAGS = ['receiver', 'comment'];
const INVALID_SNAP_TAGS = ['receiver'];
const FLATTEN_SNAP_TAGS = ['autolambda'];
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

    prepare() {
        this.simplify();
        this.addConcurrencyNodes();
    }

    simplify() {
        this.children.forEach(node => node.simplify());
    }

    addConcurrencyNodes() {
        this.children.forEach(node => node.addConcurrencyNodes());
    }

    code(backend) {
        throw new Error(`code not implemented for ${this.constructor.name}`);
    }

    static from(xmlElement) {
        const {attributes, tag} = xmlElement;
        if (INVALID_SNAP_TAGS.includes(tag)) {
            throw new Error(`Invalid xml type for AST generation: ${tag}`);
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

        for (let i = 0; i < xmlElement.children.length; i++) {
            const childTag = xmlElement.children[i].tag;
            if (SKIP_SNAP_TAGS.includes(childTag)) {
                continue;
            }
            const node = AstNode.from(xmlElement.children[i]);
            block.addChild(node);
        }

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

    simplify() {
        super.simplify();

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
    }

    addConcurrencyNodes() {
        super.addConcurrencyNodes();
        const isLoop = ['doRepeat', 'doForever', 'doUntil'].includes(this.type);

        if (isLoop) {
            const isWarping = this.isContainedIn('doWarp');
            // TODO: Add support for disabling warping
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
        return backend[this.type](this) + suffix;
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
};

const EXPRESSION_TYPES = [
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
    'bool',
    'list',
    'getJSFromRPCStruct',
];

module.exports.AstNode = AstNode;
module.exports.Block = Block;
module.exports.BuiltIn = BuiltIn;
module.exports.Primitive = Primitive;
module.exports.EXPRESSION_TYPES = EXPRESSION_TYPES;
