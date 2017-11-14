const base = require('./nop');
const clone = require('../utils').clone;
const SPromise = require('synchronous-promise').SynchronousPromise;

const WARP_VAR = '__isAtomic';
const isString = val => typeof val === 'string';
const isNil = val => val === undefined || val === null;

var context = clone(base);

///////////////////// Motion ///////////////////// 
context.xPosition = function() {
    return this.xPosition;
};

context.setXPosition = function(value) {
    this.xPosition = +value || 0;
};

context.changeXPosition = function(value) {
    this.xPosition += (+value || 0);
};

context.yPosition = function() {
    return this.yPosition;
};

context.setYPosition = function(value) {
    this.yPosition = +value || 0;
};

context.changeYPosition = function(value) {
    this.yPosition += (+value || 0);
};

context.gotoXY = function(x, y) {
    this.xPosition = +x;
    this.yPosition = +y;
};

context.forward = function(dist) {
    var degrees = (-1 * (this.direction - 90) + 360) % 360,
        angle = degrees * Math.PI / 180,
        dx, dy;

    dx = Math.cos(angle) * +dist;
    dy = Math.sin(angle) * +dist;

    this.yPosition += dy;
    this.xPosition += dx;
};

context.turnLeft = function(value) {
    this.direction -= (+value || 0);
};

context.turn = function(value) {
    this.direction += (+value || 0);
};

context.direction = function() {
    return +this.direction;
};

context.setHeading = function(dir) {
    this.direction = +dir || 0;
};

///////////////////// Control ///////////////////// 
context.doIfElse = function(cond, ifTrue, ifFalse) {
    if (cond) {
        return ifTrue();
    } else {
        return ifFalse();
    }
};

context.doReport = function(value) {
    console.log('calling doReport with', value);
    return value;
};

context.doYield = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1),
        context = args.pop();

    var isAtomic = context.get(WARP_VAR, true);
    if (isAtomic && isAtomic.value) {
        fn.apply(this, args);
    } else {
        setTimeout(() => fn.apply(this, args), 5);
    }
};

context.doWarp = function(isStart, context) {
    context.set(WARP_VAR, isStart);
};

context.doBroadcast = function(event) {
    this.emit(event);
};

context.doBroadcastAndWait = function(event) {
    this.emit(event, true);
};

context.doWait = function(duration, after) {
    var context = arguments[arguments.length-1],
        warpVar = context.get(WARP_VAR, true),
        isWarping = warpVar && warpVar.value === true;

    duration = duration || 0;
    if (duration === 0 && isWarping) {
        after();
    } else {
        setTimeout(after, duration*1000);
    }
};

context.createClone = function(name) {
    var sprite = this;
    if (name !== 'myself') {
        sprite = this.project.sprites.find(sprite => sprite.name === name);
    }
    sprite.clone();
};

///////////////////// Looks ///////////////////// 
context.doThink = function(msg) {
    console.error(msg);
};

context.doThinkFor = function(msg, duration, after) {
    console.error(msg);
    duration = +duration || 0;
    setTimeout(after, duration*1000);
};

context.doSayFor = function(msg, duration, after) {
    console.log(msg);
    duration = +duration || 0;
    setTimeout(after, duration*1000);
};

context.bubble = function(msg) {
    console.log(msg);
};

context.doWearNextCostume = function() {
    this.costumeIdx++;
};

context.changeScale = function(value) {
    this.size += value || 0
};

context.setScale = function(value) {
    this.size = +value;
};

context.getScale = function() {
    return this.size;
};

context.getCostumeIdx = function() {
    return this.costumeIdx;
};

///////////////////// Sensing ///////////////////// 
context.reportDate = function(format) {
    var dateMap = {
        'year' : 'getFullYear',
        'month' : 'getMonth',
        'date': 'getDate',
        'day of week' : 'getDay',
        'hour' : 'getHours',
        'minute' : 'getMinutes',
        'second' : 'getSeconds',
        'time in milliseconds' : 'getTime'
    };

    if (dateMap[format]) {
        return new Date()[dateMap[format]]();
    } else {
        return '';
    }
};

context.doResetTimer = function() {
    this.resetTimer();
};

context.getTimer = function() {
    return (Date.now() - this.getTimerStart())/1000;
};

///////////////////// Sounds ///////////////////// 
context.doSetTempo = function(bpm) {
    this.setTempo(bpm);
};

context.doChangeTempo = function(val) {
    this.setTempo(this.getTempo() + (+val || 0));
};

context.getTempo = function() {
    return this.getTempo();
};

///////////////////// Operators ///////////////////// 
context.reportIsIdentical =
context.reportEquals = function(a, b) {
    if (a instanceof Array || (b instanceof Array)) {
        if (a instanceof Array && (b instanceof Array)) {
            return a.reduce((isEqual, item, index) => {
                return isEqual && context.reportEquals(item, b[index]);
            }, true)
        }
        return false;
    }

    var x = +a,
        y = +b,
        i,
        specials = [true, false, ''];

    for (i = 9; i <= 13; i += 1) {
        specials.push(String.fromCharCode(i));
    }
    specials.push(String.fromCharCode(160));

    // check for special values before coercing to numbers
    if (isNaN(x) || isNaN(y) ||
            [a, b].some(function (any) {return specials.includes(any) ||
                  (isString(any) && (any.indexOf(' ') > -1)); })) {
        x = a;
        y = b;
    }

    // handle text comparison case-insensitive.
    if (isString(x) && isString(y)) {
        return x.toLowerCase() === y.toLowerCase();
    }

    return x === y;
};

context.doRun = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    
    return fn.apply(this, args);
};

context.reportJSFunction = function(args, body) {
    return Function.apply(
        null,
        args.concat([body])
    );
};

context.reportIsA = function(thing, type) {
    if (type === 'number' && typeof thing === 'string') {
        return !isNaN(+thing);
    }
    return typeof thing === type;
};

context.reportRound = function(number) {
    return Math.round(number);
};

context.reportModulus = function(left, right) {
    return left % right;
};

context.reportProduct = function(left, right) {
    return left * right;
};

context.reportRandom = function(min, max) {
    var floor = +min,
        ceil = +max;
    if ((floor % 1 !== 0) || (ceil % 1 !== 0)) {
        return Math.random() * (ceil - floor) + floor;
    }
    return Math.floor(Math.random() * (ceil - floor + 1)) + floor;
};

context.reportQuotient = function (left, right) {
    return left/right;
};

context.reportDifference = function (left, right) {
    return left - right;
};

context.reportSum = function(left, right) {
    return (+left) + (+right);
};

context.reportGreaterThan = function(a, b) {
    var x = +a,
        y = +b;
    if (isNaN(x) || isNaN(y)) {
        x = a;
        y = b;
    }
    return x > y;
};

context.reportLessThan = function(a, b) {
    var x = +a,
        y = +b;

    if (isNaN(x) || isNaN(y)) {
        x = a;
        y = b;
    }
    return x < y;
};

context.reportTextSplit = function(string, delimiter) {
    var types = ['string', 'number'],
        strType = typeof string,
        delType = typeof delimiter,
        str,
        del;

    if (!types.includes(strType)) {
        throw new Error('expecting text instead of a ' + strType);
    }
    if (!types.includes(delType)) {
        throw new Error('expecting a text delimiter instead of a ' + delType);
    }
    str = isNil(string) ? '' : string.toString();
    switch (delimiter) {
    case 'line':
        // Unicode compliant line splitting (platform independent)
        // http://www.unicode.org/reports/tr18/#Line_Boundaries
        del = /\r\n|[\n\v\f\r\x85\u2028\u2029]/;
        break;
    case 'tab':
        del = '\t';
        break;
    case 'cr':
        del = '\r';
        break;
    case 'whitespace':
        str = str.trim();
        del = /\s+/;
        break;
    case 'letter':
        del = '';
        break;
    default:
        del = isNil(delimiter) ? '' : delimiter.toString();
    }
    return str.split(del);
};

context.reportStringSize = function (data) {
    if (data instanceof Array) { // catch a common user error
        return data.length();
    }

    return data ? data.toString().length : 0;
};

context.reportOr = function (left, right) {
    return left || right;
};

context.reportNot = function (bool) {
    return !bool;
};

context.reportAnd = function (left, right) {
    return left && right;
};

///////////////////// Variables ///////////////////// 
context.reportCDR = function(list) {
    return list.slice(1);
};

context.reportCONS = function(head, list) {
    var newList = list.slice();
    newList.unshift(head);
    return newList;
};

context.reportNewList = function(list) {
    return list;
};

context.reportListLength = function(list, context) {
    return list ? list.length : 0;
};

context.doDeleteFromList = function(index, list) {
    list.splice(index-1, 1);
};

context.doReplaceInList = function(index, list, item, context) {
    list[index-1] = item;
};

context.doInsertInList = function(item, index, list) {
    list.splice(index-1, 0, item);
};

context.reportListItem = function(index, list) {
    return list[index-1];
};

context.reportListContainsItem = function(list, item) {
    list = list || [];
    return list.includes(item);
};

context.variable = function(name, context) {
    var variable = context.get(name);
    return variable && variable.value;
};

context.doSetVar = function(name, val, context) {
    var variable = context.get(name);
    variable.value = val;
};

context.doChangeVar = function(name, val, context) {
    var variable = context.get(name);
    variable.value = +variable.value + (+val);
};

context.doDeclareVariables = function() {
    var args = Array.prototype.slice.call(arguments),
        context = args.pop();

    for (var i = args.length; i--;) {
        context.set(args[i], 0);
    }
};

context.doAddToList = function(value, name, context) {
    var list = context.get(name);
    if (name && list) {
        list.value.push(value);
    }
};

context.evaluate = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new SPromise(resolve => {
        let cxt = args.pop();
        args.push(resolve);
        args.push(cxt);
        return fn.apply(this, args);
    });
};

context.evaluateCustomBlock = function(name, fnVar) {
    var args = Array.prototype.slice.call(arguments, 2),
        fn = fnVar.value;

    return new SPromise(resolve => {
        let cxt = args.pop();
        args.push(resolve);
        args.push(cxt);
        return fn.apply(this, args);
    });
};

module.exports = context;
