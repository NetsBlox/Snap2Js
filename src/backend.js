// Generating the js code from the ast nodes (indexed by node type)
const utils = require('./utils');
const indent = utils.indent;
const sanitize = utils.sanitize;
const CALLER = '__SELF';
const callRawFnWithArgs = require('./backend-helpers').callRawFnWithArgs;
const callFnWithArgs = require('./backend-helpers').callFnWithArgs;
const callStatementWithArgs = require('./backend-helpers').callStatementWithArgs;
const callRawStatementWithArgs = require('./backend-helpers').callRawStatementWithArgs;
const newPromise = require('./backend-helpers').newPromise;

const backend = {};

///////////////////// Motion /////////////////////

backend.turn =
backend.turnLeft =
backend.setHeading =
backend.setXPosition =
backend.setYPosition =
backend.changeXPosition =
backend.changeYPosition =
backend.forward = function(node) {
    const dist = node.first().code(this);
    return callStatementWithArgs(node.type, dist);
};

backend.xPosition =
backend.direction =
backend.yPosition = function(node) {
    return callFnWithArgs(node.type);
};

backend.gotoXY = function(node) {
    var x = this.generateCode(node.inputs[0]);
    var y = this.generateCode(node.inputs[1]);
    return callStatementWithArgs(node.type, x, y);
};

backend.doFaceTowards = function(node) {
    var target = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, target);
};

backend.doGotoObject = function(node) {
    var target = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, target);
};

backend.doGlide = function(node) {
    var time = this.generateCode(node.inputs[0]);
    var x = this.generateCode(node.inputs[1]);
    var y = this.generateCode(node.inputs[2]);
    return callStatementWithArgs(node.type, x, y, time);
};

backend.bounceOffEdge = function(node) {
    return callStatementWithArgs(node.type);
};

///////////////////// Control /////////////////////
backend.doWarp = function(node) {
    // doWarp is essentially compiled away since we add explicit
    // doYield nodes to the AST
    return node.first().code(this);
};

backend.doWait = function(node) {
    const time = node.first().code(this);
    return `await ${callStatementWithArgs(node.type, time)}`;
};

backend.doIf = function(node) {
    const [condition, body] = node.inputs().map(input => input.code(this));

    return `if (${condition}) ${body}`;

    //return callStatementWithArgs(node.type, condition, ifTrue);
};

backend.doIfElse = function(node) {
    var cond = this.generateCode(node.inputs[0]),
        ifTrue = this.generateCode(node.inputs[1]),
        ifFalse = this.generateCode(node.inputs[2]);

    // wrap true/false bodies into function so they can be passed as callbacks
    // TODO: Add test
    ifTrue = `function() {\n${ifTrue}\n}`;
    ifFalse = `function() {\n${ifFalse}\n}`;
    return callStatementWithArgs(node.type, cond, ifTrue, ifFalse);
};

backend.doReport = function(node) {
    // Get the current callback name and call it!
    const value = node.first() ? node.first().code(this) : '';
    return `return ${callStatementWithArgs(node.type, value)}`;
};

backend.removeClone =
backend.doPauseAll = function(node) {
    return callStatementWithArgs(node.type);
};

backend.createClone =
backend.doStopThis =
backend.doStopOthers =
backend.doWaitUntil =
backend.doBroadcast = function(node) {
    const event = node.first().code(this);
    return callStatementWithArgs(node.type, event);
};

backend.doBroadcastAndWait = function(node) {
    return `await ${backend.doBroadcast(node)}`;
};

backend.reportCallCC =
backend.evaluate = function(node) {
    const fn = node.first() ? node.first().code(this) : '';
    const argInputs = node.inputs()[1] ? node.inputs()[1].inputs() : [];
    const args = argInputs.map(arg => arg.code(this));

    // TODO: Check if it is async...
    return `await ${fn}()`;
    if (args.length) {
        return callFnWithArgs(node.type, fn, args);
    } else {
        return callFnWithArgs(node.type, fn);
    }
};

backend.doCallCC = function(node) {
    return node.first().code(this);
};

backend.fork = function(node) {
    const [fn, argInputs] = node.inputs();
    return `setTimeout(() => ${fn.code(this)}.apply(null, ${argInputs.code(this)}), 0)`;
};

backend.doRepeat = function(node) {
    const count = node.first() ? node.first().code(this) : 0;
    const body = node.inputs()[1];
    const iterVar = node.id;
    return `;for (let ${iterVar} = +${count}; ${iterVar}--;) ${body.code(this)}`;
};

backend.doYield = function(node) {
    return `await ${callStatementWithArgs('doYield')}`;
};

backend.doForever = function(node) {
    // Yield at the end of the loop...
    const block = node.first().code(this);
    return `while (1) ${block}`;
};

backend.doUntil = function(node) {
    // TODO: Check if the cond is async!
    const cond = node.first() ? node.first().code(this) : 'false';
    const block = node.inputs()[1];
    return `while(!${cond}) ${block.code(this)}`;
};

///////////////////// Looks /////////////////////
backend.doSwitchToCostume = function(node) {
    var costume = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, costume);
};

backend.doWearNextCostume = function(node) {
    return callStatementWithArgs(node.type);
};

backend.changeEffect =
backend.setEffect = function(node) {
    var effect = this.generateCode(node.inputs[0]);
    var amount = this.generateCode(node.inputs[1]);
    return callStatementWithArgs(node.type, effect, amount);
};

backend.clearEffects = function(node) {
    return callStatementWithArgs(node.type);
};

backend.goBack =
backend.changeScale =
backend.setScale = function(node) {
    var amount = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, amount);
};

backend.getCostumeIdx =
backend.getScale = function(node) {
    return callFnWithArgs(node.type);
};

backend.show =
backend.comeToFront =
backend.hide = function(node) {
    return callStatementWithArgs(node.type);
};

backend.doSayFor = function(node) {
    var time = this.generateCode(node.inputs[1]),
        msg = this.generateCode(node.inputs[0]),
        afterFn = `afterSay_${node.id}`;

    // TODO: handle rejections?
    // This can only fail if the underlying implementation is faulty...
    return [
        `new SPromise(${afterFn} => {`,
        callStatementWithArgs(node.type, msg, time, afterFn),
        `})`
    ].join('\n');
};

backend.doThinkFor = function(node) {
    var time = this.generateCode(node.inputs[1]),
        msg = this.generateCode(node.inputs[0]),
        afterFn = `afterThink_${node.id}`;

    // TODO: handle rejections?
    // This can only fail if the underlying implementation is faulty...
    return [
        `new SPromise(${afterFn} => {`,
        callStatementWithArgs(node.type, msg, time, afterFn),
        `})`
    ].join('\n');
};

backend.bubble = function(node) {
    const inputs = node.first().code(this);
    return callStatementWithArgs(node.type, inputs);
};

backend.doThink = function(node) {
    const msg = node.first() ? node.first().code(this) : '""';
    return callStatementWithArgs(node.type, msg);
};

///////////////////// Sensing /////////////////////
backend.doAsk = function(node) {
    var msg = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, msg);
};

backend.doResetTimer = function(node) {
    return callStatementWithArgs(node.type);
};

backend.doSetFastTracking = function(node) {
    var bool = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, bool);
};

backend.reportTouchingObject = function(node) {
    var obj = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, obj);
};

backend.reportTouchingColor = function(node) {
    var color = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, color);
};

backend.reportDate =
backend.reportURL =
backend.reportGet = function(node) {
    var thing = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, thing);
};

backend.reportColorIsTouchingColor = function(node) {
    var first = this.generateCode(node.inputs[0]);
    var second = this.generateCode(node.inputs[1]);
    return callFnWithArgs(node.type, first, second);
};

backend.reportAttributeOf = function(node) {
    var attr = this.generateCode(node.inputs[0]);
    var obj = this.generateCode(node.inputs[1]);
    return callFnWithArgs(node.type, attr, obj);
};

backend.reportIsFastTracking =
backend.getTimer =
backend.reportMouseX =
backend.reportMouseY =
backend.reportMouseDown =
backend.getLastAnswer = function(node) {
    return callFnWithArgs(node.type);
};

backend.reportKeyPressed = function(node) {
    var key = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, key);
};

backend.reportDistanceTo = function(node) {
    var obj = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, obj);
};

///////////////////// Sounds /////////////////////
backend.doSetTempo =
backend.doChangeTempo =
backend.playSound =
backend.doPlaySoundUntilDone = function(node) {
    var sound = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, sound);
};

backend.doStopAllSounds = function(node) {
    return callStatementWithArgs(node.type);
};

backend.doRest = function(node) {
    var duration = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, duration);
};

backend.doPlayNote = function(node) {
    var note = this.generateCode(node.inputs[0]);
    var duration = this.generateCode(node.inputs[1]);
    return callStatementWithArgs(node.type, note, duration);
};

backend.getTempo = function(node) {
    return callFnWithArgs(node.type);
};

///////////////////// Operators /////////////////////
backend.reportMonadic =
backend.reportModulus =
backend.reportQuotient =
backend.reportProduct =
backend.reportDifference =
backend.reportRandom =
backend.reportSum = function(node) {
    var left = this.generateCode(node.inputs[0]),
        right = this.generateCode(node.inputs[1]);

    return callFnWithArgs(node.type, left, right);
};

backend.reportRound = function(node) {
    var number = this.generateCode(node.inputs[0]);

    return callFnWithArgs(node.type, number);
};

backend.reportIsIdentical =
backend.reportIsA =
backend.reportAnd =
backend.reportOr =
backend.reportTextSplit =
backend.reportGreaterThan =
backend.reportLessThan =
backend.reportEquals = function(node) {
    const [leftNode, rightNode] = node.inputs();
    const left = leftNode ? leftNode.code(this) : 'false';
    const right = rightNode ? rightNode.code(this) : 'false';

    // TODO: replace ternary with a safe get method?
    return callFnWithArgs(node.type, left, right);
};

backend.reportJoinWords = function(node) {
    const listInput = node.first(),
        inputs = listInput.inputs().map(input => input.code(this)),
        args = inputs.slice();

    args.unshift(node.type);
    return callFnWithArgs.apply(this, args);
};

backend.reportNot =
backend.reportStringSize = function(node) {
    var str = this.generateCode(node.inputs[0]);

    return callFnWithArgs(node.type, str);
};

backend.reportBoolean = function(node) {
    return node.first().code(this);
};

backend.reportJSFunction = function(node) {
    var args = this.generateCode(node.inputs[0]),
        body = this.generateCode(node.inputs[1]);

    return callFnWithArgs(node.type, args, body);
};

backend.reifyScript = function(node) {
    const [body, argList] = node.inputs();
    const args = argList.inputs().map(input => input.code(this));
    const tmpArgs = args.map((_, i) => `a${i}`);
    //const [body='{}', args=[]] = node.inputs().map(input => input.code(this));
    return [
    `(async function(${tmpArgs.join(', ')}) {`,
        indent(`let context = new VariableFrame(arguments[${args.length}] || DEFAULT_CONTEXT);`),
        indent(`let self = context.get('${CALLER}').value;`),
        indent(args.map((arg, index) => `context.set(${arg}, a${index});`).join('\n')),
        indent(`let OUTER_CONTEXT = DEFAULT_CONTEXT;`),
        indent(`DEFAULT_CONTEXT = context;`),
        // TODO: Check if async?
        indent(`const result_${node.id} = await (async function()${body.code(this)})();`),
        indent(`;DEFAULT_CONTEXT = OUTER_CONTEXT;`),
        indent(`return result_${node.id};`),
    `}).bind(self)`,
    ].join('\n');
};

//backend.reifyScript = function(node) {
    //// TODO: do the same thing as before but only return the doReport value...
    //// we need to handle
//};

backend.doRun = function(node) {
    var fn = this.generateCode(node.inputs[0]),
        args = node.inputs[1].inputs.map(this.generateCode);

    if (args.length) {
        return callStatementWithArgs(node.type, fn, args);
    }
    return callStatementWithArgs(node.type, fn);
};

///////////////////// Pen /////////////////////
backend.up =
backend.down =
backend.doStamp =
backend.floodFill =
backend.clear = function(node) {
    return callStatementWithArgs(node.type);
};

backend.setColor = function(node) {
    var color = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, color);
};

backend.setHue =
backend.changeHue = function(node) {
    var hue = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, hue);
};

backend.setBrightness =
backend.changeBrightness = function(node) {
    var brightness = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, brightness);
};

backend.setSize =
backend.changeSize = function(node) {
    var size = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, size);
};

///////////////////// Variables /////////////////////
backend.doChangeVar =
backend.doSetVar = function(node) {
    if (!node.inputs().length) return '';

    const [name, value=''] = node.inputs().map(input => input.code(this));
    return callStatementWithArgs(node.type, name, value);
};

backend.doShowVar =
backend.doHideVar = function(node) {
    var name = this.generateCode(node.inputs[0]);

    return callStatementWithArgs(node.type, name);
};

backend.doDeclareVariables = function(node) {
    const names = node.inputs().map(input => input.code(this));
    return callStatementWithArgs(node.type, names.join(', '));
};

backend.doAddToList = function(node) {
    var value = node.first() ? node.first().code(this) : '',
        rawList = node.inputs()[1],
        list = null;

    if (rawList && rawList.type === 'variable') {
        list = sanitize(rawList.value);
    }
    return callStatementWithArgs(node.type, value, list);
};

backend.reportListLength = function(node) {
    var variable = this.generateCode(node.inputs[0]);

    return callFnWithArgs(node.type, variable);
};

backend.reportListItem = function(node) {
    var index = this.generateCode(node.inputs[0]),
        list = this.generateCode(node.inputs[1]);

    return callFnWithArgs(node.type, index, list);
};

backend.reportCDR = function(node) {
    var list = this.generateCode(node.inputs[0]);
    return callFnWithArgs(node.type, list);
};

backend.reportNewList = function(node) {
    var items = node.inputs().map(input => input.code(this)),
        args = [node.type].concat(items);

    return callFnWithArgs.apply(null, args);
};

backend.reportListContainsItem = function(node) {
    var list = this.generateCode(node.inputs[0]);
    var item = this.generateCode(node.inputs[1]);
    return callFnWithArgs(node.type, list, item);
};

backend.doDeleteFromList = function(node) {
    var list = this.generateCode(node.inputs[1]);
    var index = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, index, list);
};

backend.doReplaceInList = function(node) {
    var index = this.generateCode(node.inputs[0]);
    var item = this.generateCode(node.inputs[2]);
    var list = this.generateCode(node.inputs[1]);

    return callStatementWithArgs(node.type, index, list, item);
};

backend.doInsertInList = function(node) {
    var value = this.generateCode(node.inputs[0]);
    var index = this.generateCode(node.inputs[1]);
    var list = this.generateCode(node.inputs[2]);

    return callStatementWithArgs(node.type, value, index, list);
};

backend.reportCONS = function(node) {
    var head = this.generateCode(node.inputs[0]);
    var list = this.generateCode(node.inputs[1]);
    return callFnWithArgs(node.type, head, list);
};

backend.variable = function(node) {
    return callFnWithArgs(node.type, sanitize(node.value));
};

backend.evaluateCustomBlock = function(node) {
    var name = node.value,
        args = [],
        safeName = sanitize(name),
        fn = `self.customBlocks.get(${safeName})`,
        types = utils.inputNames(name);

    args = node.inputs
        .map((input, index) => {
            var type = types[index];
            if (type === 'cs') {  // cslots should be wrapped in fn
                return {
                    type: 'reifyScript',
                    inputs: [
                        input,
                        {
                            type: 'list',
                            inputs: []
                        }
                    ]
                };
            }
            return input;

        })
        .map(this.generateCode);

    if (args.length) {
        return callFnWithArgs(node.type, safeName, fn, args);
    } else {
        return callFnWithArgs(node.type, safeName, fn);
    }
};

///////////////////// Primitives /////////////////////
backend.string = function(node) {
    return sanitize(node.value);
};

backend.option = function(node) {
    return utils.sanitize(node.value);
};

backend.bool = function(node) {
    return node.value;
};

backend.list = function(node) {
    const inputs = node.inputs().map(input => input.code(this));
    return `[${inputs.join(', ')}]`;
};

backend.getJSFromRPCStruct = function(node) {
    const args = node.inputs().map(input => input.code(this));
    return callFnWithArgs(node.type, args.join(','));
};

//backend.script = function(node) {
// TODO
//};

backend.eventHandlers = {};
backend.eventHandlers.receiveOnClone =
backend.eventHandlers.receiveGo = function(node, code) {
    return [
        '(async function() {',
        'let DEFAULT_CONTEXT = new VariableFrame(self.variables);',
        indent(code),
        '})();'
    ].join('\n');
};

backend.eventHandlers.receiveMessage = function(node, code) {
    var event = node.first().code(this),
        cond = event === utils.sanitize(`any message`) ? 'true' : `event === ${event}`;

    return [
        '(async function() {',
        `if (${cond}) {`,
        'let DEFAULT_CONTEXT = new VariableFrame(self.variables);',
        indent(code),
        '}',
        '})();',
    ].join('\n');
};

backend.eventHandlers.receiveKey = function(node, code) {
    const key = node.first().code(this);
    const cond = key === `'any key'` ? 'true' : `key === ${key}`;

    return [
        '(async function() {',
        `if (${cond}) {`,
        'let DEFAULT_CONTEXT = new VariableFrame(self.variables);',
        indent(code),
        '}',
        '})();',
    ].join('\n');
};

module.exports = backend;
