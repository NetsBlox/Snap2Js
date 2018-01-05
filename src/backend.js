// Generating the js code from the ast nodes (indexed by node type)
const utils = require('./utils');
const indent = utils.indent;
const CALLER = '__SELF';
var backend = {};

var callRawFnWithArgs = function(fn) {
    var inputs = Array.prototype.slice.call(arguments, 1);
    if (inputs.length) {
        return `callMaybeAsync(self, ${fn}, ${inputs.join(', ')}, __CONTEXT)`;
    }
    return `callMaybeAsync(self, ${fn}, __CONTEXT)`;
};

var callFnWithArgs = function(fn) {
    arguments[0] = `__ENV.${fn}`;
    return callRawFnWithArgs.apply(null, arguments);
};

var callStatementWithArgs = function() {
    return callFnWithArgs.apply(null, arguments) + '\n';
};

var callRawStatementWithArgs = function() {
    return callRawFnWithArgs.apply(null, arguments) + '\n';
};

const newPromise = (value='') => `SPromise.resolve(${value})`;

///////////////////// Motion /////////////////////

backend.turn =
backend.turnLeft =
backend.setHeading =
backend.setXPosition =
backend.setYPosition =
backend.changeXPosition =
backend.changeYPosition =
backend.forward = function(node) {
    var dist = this.generateCode(node.inputs[0]);
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
    let body = this.generateCode(node.inputs[0]);
    let afterFn = `callback_${node.id}_${Date.now()}`;
    return `new SPromise(${afterFn} => ${callStatementWithArgs(node.type, true)}
        .then(() => ${body})
        .then(() => ${callStatementWithArgs(node.type, false)})
        .then(() => ${afterFn}())
    )`;

};

backend.doWait = function(node) {
    var time = this.generateCode(node.inputs[0]),
        afterFn = `afterWait_${node.id}`;

    return [
        `new SPromise(${afterFn} => {`,
        callStatementWithArgs(node.type, time, afterFn),
        `})`
    ].join('\n');
};

backend.doIf = function(node) {
    var cond = this.generateCode(node.inputs[0]),
        ifTrue = '';

    if (node.inputs[1]) {
        ifTrue = this.generateCode(node.inputs[1]);
    }
    ifTrue = `function() {\n${ifTrue}\n}`;

    return callStatementWithArgs(node.type, cond, ifTrue);
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
    var value = this.generateCode(node.inputs[0]);
    let callback = getCallbackName(node);
    if (!node.parent) throw 'no parent:' + node.type;

    if (callback) {
        return callRawStatementWithArgs(callback, value);
    } else {
        return callStatementWithArgs(node.type, value);
    }
};

backend.removeClone =
backend.doPauseAll = function(node) {
    return callStatementWithArgs(node.type);
};

backend.createClone =
backend.doStopThis =
backend.doStopOthers =
backend.doWaitUntil =
backend.doBroadcast =
backend.doBroadcastAndWait = function(node) {
    var event = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, event);
};

backend.reportCallCC =
backend.evaluate = function(node) {
    var fn = this.generateCode(node.inputs[0]),
        argInputs = node.inputs[1] ? node.inputs[1].inputs : [],
        args = argInputs.map(this.generateCode);

    if (args.length) {
        return callFnWithArgs(node.type, fn, args);
    } else {
        return callFnWithArgs(node.type, fn);
    }
};

backend.doCallCC = function(node) {
    var fn = this.generateCode(node.inputs[0]),
        argInputs = node.inputs[1] ? node.inputs[1].inputs : [],
        args = argInputs.map(this.generateCode);

    if (args.length) {
        return callStatementWithArgs(node.type, fn, args);
    }
    return callStatementWithArgs(node.type, fn);
};

backend.fork = function(node) {
    var fn = this.generateCode(node.inputs[0]),
        argInputs = node.inputs[1] ? node.inputs[1].inputs : [],
        args = argInputs.map(this.generateCode);

    if (args.length) {
        return callStatementWithArgs('doYield', fn, args);
    }
    return callStatementWithArgs('doYield', fn);
};

backend.doRepeat = function(node) {
    var count = node.inputs[0] ? this.generateCode(node.inputs[0]) : 0,
        body = this.generateCode(node.inputs[1]),
        next = this.generateCode(node.next),
        iterVar = node.id,
        recurse;

    recurse = callStatementWithArgs('doYield', `doLoop_${node.id}`, node.id);

    let cond = `${node.id}-- > 0`;
    let doLoop = `() => {${body}.then(() => ${recurse})}`;
    let callback = `resolve_${node.id}_${Date.now()}`;
    let doElse = `() => {${next}.then(() => ${callback}());\n}`;
    loopControl = callStatementWithArgs('doIfElse', cond, doLoop, doElse);

    return [
        `new SPromise(${callback} => {`,
        `function doLoop_${node.id} (${node.id}) {`,
        `return ${indent(loopControl)};`,
        `}`,
         callRawStatementWithArgs(`doLoop_${node.id}`, count),
        `})`
    ].join('\n');
};
backend.doRepeat.async = true;

backend.doForever = function(node) {
    var recurse = callStatementWithArgs('doYield', `doForever_${node.id}`),
        body = recurse;

    if (node.inputs[0]) {
        body = `${this.generateCode(node.inputs[0])}.then(() => ${recurse})`;
    } else {
        body = recurse;
    }

    return [
        `new SPromise(() => {`,
        `function doForever_${node.id} () {`,
        indent(body),
        `}`,
         `doForever_${node.id}();`,
        `})`
    ].join('\n');
};

backend.doUntil = function(node) {
    var cond = newPromise(false),
        body = newPromise(),
        exitBody = node.next ? this.generateCode(node.next) : newPromise(),
        callback = `resolve_${node.id}_${Date.now()}`,
        iterVar = node.id,
        recurse;

    // Convert the doUntil to a recursive doIfElse
    recurse = callStatementWithArgs('doYield', `doLoop_${node.id}`);

    if (node.inputs[1]) {
        body = this.generateCode(node.inputs[1]);
    }
    if (node.inputs[0]) {
        cond = this.generateCode(node.inputs[0]);
    }

    let execBody = `function() {\n${body}.then(() => ${recurse})}`;
    let exitLoop = `function() {\n${exitBody}.then(() => \n${callback}());\n}`;

    loopControl = callStatementWithArgs('doIfElse', cond, exitLoop, execBody);
    return [
        `new SPromise(${callback} => {`,
        `function doLoop_${node.id} () {`,
        `${indent(loopControl)};`,
        `}`,
         `doLoop_${node.id}();`,
        `})`
    ].join('\n');
};
backend.doUntil.async = true;

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

    return [
        `new SPromise(${afterFn} => {`,
        callStatementWithArgs(node.type, msg, time, afterFn),
        `})`
    ].join('\n');
};

backend.bubble = function(node) {
    var inputs = this.generateCode(node.inputs[0]);
    return callStatementWithArgs(node.type, inputs);
};

backend.doThink = function(node) {
    var msg = this.generateCode(node.inputs[0]);
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
    var left = this.generateCode(node.inputs[0]),
        right = this.generateCode(node.inputs[1]);

    return callFnWithArgs(node.type, left, right);
};

backend.reportJoinWords = function(node) {
    var listInput = node.inputs[0],
        inputs = listInput.inputs.map(this.generateCode);

    return `[${inputs.join(',')}].join('')`;
};

backend.reportNot =
backend.reportStringSize = function(node) {
    var str = this.generateCode(node.inputs[0]);

    return callFnWithArgs(node.type, str);
};

backend.reportBoolean = function(node) {
    return this.generateCode(node.inputs[0]);
};

backend.reportJSFunction = function(node) {
    var args = this.generateCode(node.inputs[0]),
        body = this.generateCode(node.inputs[1]);

    return callFnWithArgs(node.type, args, body);
};

const TYPES_WITH_CALLBACKS = [
    'reifyScript',
    'reifyReporter',
    'reifyPredicate'
];
let nodeIdCounter = 1;

// Get the name of the callback fn of the closest enclosing fn definition
const getCallbackName = node => {
    if (TYPES_WITH_CALLBACKS.includes(node.type)) {
        if (!node.id) {
            node.id = `anon_item__${nodeIdCounter++}`;
        }
        return `callback${node.id.replace(/-/g, '_')}`;
    }

    if (node.parent) return getCallbackName(node.parent);

    return null;
};

backend.reifyScript =
backend.reifyReporter =
backend.reifyPredicate = function(node) {
    var body = '',
        cb = getCallbackName(node),
        args = node.inputs[1].inputs
            .map(this.generateCode);

    if (node.inputs[0]) {
        body = this.generateCode(node.inputs[0]);
    }

    // TODO: add the callback name to the function...
    // TODO: doReport should call this callback...
    return [
        `function(${args.map((e, i) => `a${i}`).join(', ')}${args.length ? ',' : ''}${cb}) {`,
        indent(`var context = new VariableFrame(arguments[${args.length+1}] || __CONTEXT);`),
        indent(`var self = context.get('${CALLER}').value;`),
        indent(args.map((arg, index) => `context.set(${arg}, a${index});`).join('\n')),
        indent(`__CONTEXT = context;`),
        indent(body),
        `}`
    ].join('\n');
};

//backend.reifyScript = function(node) {
    //// TODO: do the same thing as before but only return the doReport value...
    //// we need to handle
//};

backend.autolambda = function(node) {
    let body = this.generateCode(node.inputs[0]);
    let callback = getCallbackName(node);

    if (callback) {
        body = `${callback}(${body});`;
    }

    return `return ${body};`;
};

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
    var name = this.generateCode(node.inputs[0]);
    var value = this.generateCode(node.inputs[1]) || '';

    return callStatementWithArgs(node.type, name, value);
};

backend.doShowVar =
backend.doHideVar = function(node) {
    var name = this.generateCode(node.inputs[0]);

    return callStatementWithArgs(node.type, name);
};

backend.doDeclareVariables = function(node) {
    var names = node.inputs[0].inputs
        .map(input => this.generateCode(input));

    return callStatementWithArgs(node.type, names.join(', '));
};

backend.doAddToList = function(node) {
    var value = this.generateCode(node.inputs[0]),
        rawList = node.inputs[1],
        list = null;

    // FIXME
    if (rawList && rawList.type === 'variable') {
        list = `'${rawList.value}'`;
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
    var items = node.inputs.map(this.generateCode),
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
    return callFnWithArgs(node.type, `'${node.value}'`);
};

backend.evaluateCustomBlock = function(node) {
    var name = node.value,
        args = [],
        fn = `self.customBlocks.get('${name}')`,
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
        return callFnWithArgs(node.type, `'${name}'`, fn, args);
    } else {
        return callFnWithArgs(node.type, `'${name}'`, fn);
    }
};

///////////////////// Primitives /////////////////////
backend.string = function(node) {
    return `\`${node.value.replace(/'/g, "\\'")}\``;
};

backend.option = function(node) {
    return this.generateCode(node.inputs[0]);
};

backend.bool = function(node) {
    return node.value;
};

backend.list = function(node) {
    var inputs = node.inputs.map(this.generateCode);
    return `SPromise.all([${inputs.join(', ')}])`;
};

backend.getJSFromRPCStruct = function(node) {
    let args = node.inputs.map(this.generateCode);
    return callFnWithArgs(node.type, args.join(','));
};

module.exports = backend;
