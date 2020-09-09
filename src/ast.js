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
const FN_EVAL = ['reportCallCC', 'evaluate', 'doCallCC'];
class Node extends GenericNode {
    constructor(id) {
        super();
        this.id = (id || `id_${Date.now()}`).replace(/[^a-zA-Z0-9]/g, '_');
    }

    addChild(child) {
        assert(child instanceof Node, `Child is not Node: ${child}`);
        if (child.parent) {
            child.parent.removeChild(child);
        }
        super.addChild(child);
    }

    replaceChild(index, child) {
        const oldChild = this.children[index];
        this.children[index] = child;
        oldChild.parent = null;
        this.children[index].parent = this;
    }

    addSiblingBefore(child) {
        assert(this.parent, 'Cannot add sibling to a node w/o a parent.');
        const myIndex = this.parent.children.indexOf(this);
        this.parent.children.splice(myIndex, 0, child);
        child.parent = this.parent;
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

    isAsync() {
        return !!this.children.find(node => node.isAsync());
    }

    simplify(allowWarp) {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const changedSiblings = child.simplify(allowWarp);
            if (changedSiblings) {
                i = this.children.indexOf(child);
            }
        }
    }

    setEmptyNodes(name) {
        this.children.forEach(node => node.setEmptyNodes(name));
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

    refactor(filter, map, terminate = () => false) {
        for (let i = 0; i < this.children.length; i++) {
            if (terminate(this.children[i])) {
                return;
            }

            if (filter(this.children[i])) {
                const newNode = map(this.children[i]);
                this.replaceChild(i, newNode);
            } else {
                this.children[i].refactor(filter, map, terminate);
            }
        }
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

        let block,
            childrenLoaded = false;
        if (tag === 'script') {
            block = new Block();
        } else if (xmlElement.tag === 'context') {
            block = Node.fromContext(xmlElement);
            childrenLoaded = true;
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

        if (!childrenLoaded) {
            for (let i = 0; i < xmlElement.children.length; i++) {
                const childTag = xmlElement.children[i].tag;
                const child = Node.from(xmlElement.children[i]);
                if (child !== null) {
                    block.addChild(child);
                }
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
        }

        // Add the execution code
        const [inputs, variables, fnBody] = element.children;
        const isNoOp = !fnBody;
        const type = (isNoOp || fnBody.tag === 'script') ? 'reifyScript' : 'reifyReporter';
        const node = new BuiltIn(null, type);  // TODO: Make these custom types?
        const fnNode = isNoOp ? null : Node.from(fnBody);
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
            const fn = this.first();
            return fn.type === 'variable' || super.isAsync();
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
            this.addChildFirst(body);
            assert(
                this.children.length === 2,
                new Error(`Expected 2 children for ${this.type}. Found ${this.children.length}`)
            );
            this.type = 'reifyScript';
        }

        if (this.type === 'reifyScript') {
            const [body, inputs] = this.children;
            const hasImplicitInputs = inputs.children.length === 0;
            if (hasImplicitInputs) {
                const varName = `arg_${this.id}`;
                const newInputs = new List();
                newInputs.addChild(new Primitive('string', varName));
                this.children[1] = newInputs;
                this.setEmptyNodes(varName);
            }
        }

        if (!allowWarp && this.type === 'doWarp') {
            this.type = 'doRepeat';
            const count = new Primitive('string', '1');
            this.addChildFirst(count);
        }

        if (this.type === 'evaluateCustomBlock') {
            const types = utils.inputNames(this.name);
            const inputs = this.inputs();
            const upvars = new List();

            for (let i = types.length; i--;) {
                if (types[i] === 'upvar') {
                    upvars.addChild(new Primitive('string', inputs[i].value));
                }
            }

            if (upvars.inputs().length) {
                const declareUpvars = new BuiltIn(null, 'doDeclareVariables');
                declareUpvars.addChild(upvars);
                this.addSiblingBefore(declareUpvars);
            }
            return true;
        }

        if (this.type === 'doForEach') {
            // Compile away the for-each and convert it to a repeat loop
            this.type = 'doRepeat';
            const [upvar, list, block] = this.inputs();
            const declareUpvars = new BuiltIn(null, 'doDeclareVariables');
            const upvars = new List();
            const listVar = new Primitive('string', `${this.id}_listvar`);
            const indexVar = new Primitive('string', `${this.id}_indexvar`);
            const iterVar = new Primitive('string', upvar.value);
            upvars.addChild(upvar);
            upvars.addChild(listVar);
            upvars.addChild(indexVar);
            upvars.addChild(iterVar);
            declareUpvars.addChild(upvars);
            this.addSiblingBefore(declareUpvars);

            const initList = new BuiltIn(null, 'doSetVar');
            initList.addChild(new Primitive('string', listVar.value));
            initList.addChild(list);
            this.addSiblingBefore(initList);

            const initIndex = new BuiltIn(null, 'doSetVar');
            initIndex.addChild(new Primitive('string', indexVar.value));
            initIndex.addChild(new Primitive('string', '1'));
            this.addSiblingBefore(initIndex);

            const iters = new BuiltIn(null, 'reportListLength');
            iters.addChild(new Variable(listVar.value));
            this.addChildFirst(iters);

            const incIndex = new BuiltIn(null, 'doChangeVar');
            incIndex.addChild(new Primitive('string', indexVar.value));
            incIndex.addChild(new Primitive('string', '1'));
            block.addChild(incIndex);

            const setIter = new BuiltIn(null, 'doSetVar');
            setIter.addChild(new Primitive('string', iterVar.value));
            const listItem = new BuiltIn(null, 'reportListItem');
            listItem.addChild(new Variable(indexVar.value));
            listItem.addChild(new Variable(listVar.value));
            setIter.addChild(listItem);
            block.addChildFirst(setIter);
            return true;
        }

        if (this.type === 'doFor') {
            this.type = 'doUntil';
            const [upvar, start, end, block] = this.inputs();
            const declareUpvars = new BuiltIn(null, 'doDeclareVariables');
            const changeAmount = new Primitive('string', `${this.id}_changeAmount`);
            const startVar = new Primitive('string', `${this.id}_start`);
            const endVar = new Primitive('string', `${this.id}_end`);
            const upvars = new List();
            upvars.addChild(upvar);
            upvars.addChild(changeAmount);
            upvars.addChild(startVar);
            upvars.addChild(endVar);
            declareUpvars.addChild(upvars);
            this.addSiblingBefore(declareUpvars);

            const initStartVar = new BuiltIn(null, 'doSetVar');
            initStartVar.addChild(new Primitive('string', startVar.value));
            initStartVar.addChild(start);
            this.addSiblingBefore(initStartVar);

            const initEndVar = new BuiltIn(null, 'doSetVar');
            initEndVar.addChild(new Primitive('string', endVar.value));
            initEndVar.addChild(end);
            this.addSiblingBefore(initEndVar);

            const initChangeAmount = new BuiltIn(null, 'doSetVar');
            initChangeAmount.addChild(new Primitive('string', changeAmount.value));
            const ternary = new BuiltIn(null, 'reportIfElse');
            const isGreaterThan = new BuiltIn(null, 'reportGreaterThan');
            isGreaterThan.addChild(new Variable(endVar.value));
            isGreaterThan.addChild(new Variable(startVar.value));

            ternary.addChild(isGreaterThan);
            ternary.addChild(new Primitive('string', '1'));
            ternary.addChild(new Primitive('string', '-1'));
            initChangeAmount.addChild(ternary);

            this.addSiblingBefore(initChangeAmount);

            const initIterVar = new BuiltIn(null, 'doSetVar');
            initIterVar.addChild(new Primitive('string', upvar.value));
            initIterVar.addChild(new Variable(startVar.value));
            this.addSiblingBefore(initIterVar);

            const incIndex = new BuiltIn(null, 'doChangeVar');
            incIndex.addChild(new Primitive('string', upvar.value));
            incIndex.addChild(new Variable(changeAmount.value));
            block.addChild(incIndex);

            const cond = new BuiltIn(null, 'reportIfElse');
            const isEndBigger = new BuiltIn(null, 'reportGreaterThan');
            isEndBigger.addChild(new Variable(endVar.value));
            isEndBigger.addChild(new Variable(startVar.value));
            cond.addChild(isEndBigger);

            const isIndexTooLarge = new BuiltIn(null, 'reportGreaterThan');
            isIndexTooLarge.addChild(new Variable(upvar.value));
            isIndexTooLarge.addChild(new Variable(endVar.value));
            cond.addChild(isIndexTooLarge);

            const isIndexTooSmall = new BuiltIn(null, 'reportLessThan');
            isIndexTooSmall.addChild(new Variable(upvar.value));
            isIndexTooSmall.addChild(new Variable(endVar.value));
            cond.addChild(isIndexTooSmall);

            this.addChildFirst(cond);
            return true;
        }
    }

    setEmptyNodes(name) {
        for (let i = this.children.length; i--;) {
            const child = this.children[i];
            if (child instanceof EmptyNode) {
                this.children[i] = new Variable(name);
            } else if (child.type !== 'reifyScript') {
                child.setEmptyNodes(name);
            }
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
        const isLoop = ['doRepeat', 'doForever', 'doUntil', 'doForEach', 'doFor']
            .includes(this.type);

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
        if (!backend[this.type](this)) {
            throw new Error(`${this.type} did not generate code!`);
        }
        return prefix + backend[this.type](this) + suffix;
    }

    getCodePrefix() {  // TODO: Should this be moved to the backend?
        const isControlFlow = [
            'doRepeat',
            'doForever',
            'doUntil',
            'doIf',
            'doIfElse',
            'doReport',
        ].includes(this.type);
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

        const defaultInput = this.getDefaultInput(this.parent.type);
        return defaultInput.code(backend);
    }

    getDefaultInput(parentType) {
        const input = DEFAULT_INPUT[parentType]
        const index = this.parent.inputs().indexOf(this);

        if (DEFAULT_INPUT[parentType]) {
            return DEFAULT_INPUT[parentType](index);
        } else if (DEFAULT_INPUTS[parentType]) {
            const inputs = DEFAULT_INPUTS[parentType]();
            if (index < inputs.length) {
                return inputs[index];
            } else {
                throw new Error(`No default value for input ${index} of ${parentType}`);
            }
        } else {
            throw new Error(`Default values unknown for ${parentType}`);
        }
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
        return this.definition.isAsync() || super.isAsync();
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
        this.variables = [];
    }
}

class Variable extends BuiltIn {
    constructor(value) {
        super();
        this.type = 'variable';
        this.addChild(new Primitive('string', value));
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

class EmptyRing extends BuiltIn {
    constructor() {
        super(null, 'reifyScript');
    }
}

const DEFAULT_INPUTS = {
    doIf: () => [new False(), new Block()],
    forward: () => [new EmptyString()],
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
    playSound: () => [new EmptyString()],
    doPlaySoundUntilDone: () => [new EmptyString()],
    doPlaySoundAtRate: () => [new EmptyString(), new EmptyString()],
    reportGetSoundAttribute: () => [new EmptyString(), new EmptyString()],
    doTellTo: () => [new EmptyString(), new EmptyRing(), new List()],
    reportAskFor: () => [new EmptyString(), new EmptyRing(), new List()],
    doBroadcastAndWait: () => [new EmptyString()],
    doWaitUntil: () => [new False()],
};
const DEFAULT_INPUT = {
    list: index => new EmptyString(),
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

    'reportPenTrailsAsCostume',
    'getPenAttribute',
    'getPenDown',
    'getEffect',
    'reportShown',
    'reportGetImageAttribute',
    'reportNewCostumeStretched',
    'reportRelationTo',
    'reportAspect',
    'reportAudio',
    'reportVideo',
    'reportGlobalFlag',
    'reportUsername',
    'reportLatitude',
    'reportLongitude',
    'reportStageHeight',
    'reportStageWidth',
    'reportKeep',
    'reportMap',
    'reportCombine',
    'reportNumbers',
    'reportListIndex',
    'reportConcatenatedLists',
    'reportFindFirst',
    'getPan',
    'getVolume',
    'reportGetSoundAttribute',
    'newClone',
    'reportIfElse',
    'reportAskFor',
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
