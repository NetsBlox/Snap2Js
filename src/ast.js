const Node = require('../lib/snap/node');

class AstNode extends Node {
    constructor(id=`id_${Date.now()}`) {
        super();
        this.id = id.replace(/[^a-zA-Z0-9]/g, '_');
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

    addConcurrencyNodes() {
        this.children.forEach(node => node.addConcurrencyNodes());
    }

    code(backend) {
        throw new Error(`code not implemented for ${this.constructor.name}`);
    }

    static from(xmlElement) {
        const {attributes, tag} = xmlElement;
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
        //} else if (xmlElement.tag === 'block') {
            //return new Statement(xmlElement);  // Could this be a reporter??
        } else if (attributes.var) {
            block = new Variable(attributes.var);
        } else if (xmlElement.contents) {
            // TODO: Get the type!
            const type = xmlElement.tag === 'l' ?
                typeof xmlElement.contents : xmlElement.tag;
            block = new Primitive(type, xmlElement.contents);
        } else if (tag === 'l') {
            block = new EmptyNode();
        } else {
            const type = attributes.s || xmlElement.tag;
            const id = attributes.collabId;
            block = new BuiltInFunction(id, type);
        }

        for (let i = 0; i < xmlElement.children.length; i++) {
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
        const handlerType = topBlock.type;
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
class BuiltInFunction extends AstNode {  // FIXME: Not the best 
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

    addConcurrencyNodes() {
        super.addConcurrencyNodes();
        const isLoop = ['doRepeat', 'doForever', 'doUntil'].includes(this.type);

        if (isLoop) {
            const isWarping = this.isContainedIn('doWarp');
            console.log('\n\n>>> isWarping?', isWarping);
            if (!isWarping) {
                const body = this.inputs().pop();
                body.addChild(new Yield());
            }
        }
    }

    code(backend) {
        if (!backend[this.type]) {
            //console.log(this.children[0].children[0].children[0].children);
            throw new Error(`Backend does not support builtin: ${this.type}`);
        }
        const suffix = this.isStatement() ? ';' : '';
        return backend[this.type](this) + suffix;
    }
}

class Primitive extends BuiltInFunction {
    constructor(type, value) {
        super(undefined, type);
        this.value = value;
    }
}

class Yield extends BuiltInFunction {
    constructor() {
        super(undefined, 'doYield');
    }

    isStatement() {
        return false;
    }
}

class EmptyNode extends BuiltInFunction {
    constructor() {
        super();
    }

    code(backend) {
        const parentType = this.parent.type;
        const inputs = DEFAULT_INPUTS[parentType]();
        const index = this.parent.inputs().indexOf(this);
        return inputs[index].code(backend);
    }
}

class CallCustomFunction extends AstNode {
    constructor(id, name) {
        super(id);
        this.name = name;
    }
}

class Variable extends BuiltInFunction {
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

const DEFAULT_INPUTS = {
    doIf: () => [new False(), new Block()],
    forward: () => [new EmptyString()]
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
    'autolambda',
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
module.exports.Primitive = Primitive;
module.exports.EXPRESSION_TYPES = EXPRESSION_TYPES;
