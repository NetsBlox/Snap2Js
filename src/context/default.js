const base = require('./nop');
const _ = require('lodash');
const WARP_VAR = '__isAtomic';

var context = _.cloneDeep(base);

// Add the basic overrides
// TODO: Add the sprite, stage, contexts and stuff

///////////////////// Motion ///////////////////// 
context.xPosition = function() {
    return this.xPosition;
};

context.setXPosition = function(value) {
    this.xPosition = value || 0;
};

context.changeXPosition = function(value) {
    this.xPosition += (value || 0);
};

context.yPosition = function() {
    return this.yPosition;
};

context.setYPosition = function(value) {
    this.yPosition = value || 0;
};

context.changeYPosition = function(value) {
    this.yPosition += (value || 0);
};

context.gotoXY = function(x, y) {
    this.xPosition = x;
    this.yPosition = y;
};

context.forward = function(dist) {
    var degrees = (-1 * (this.direction - 90) + 360) % 360,
        angle = degrees * Math.PI / 180,
        dx, dy;

    dx = Math.cos(angle) * dist;
    dy = Math.sin(angle) * dist;

    this.yPosition += dy;
    this.xPosition += dx;
};

context.turnLeft = function(value) {
    this.direction -= (value || 0);
};

context.turn = function(value) {
    this.direction += (value || 0);
};

context.direction = function() {
    return this.direction;
};

context.setHeading = function(dir) {
    this.direction = dir || 0;
};

///////////////////// Control ///////////////////// 
context.doReport = function(value) {
    return value;
};

context.doYield = function(fn) {
    var args = Array.prototype.slice.call(arguments, 1),
        context = args.pop();

    var isAtomic = context.get(WARP_VAR);
    if (isAtomic && isAtomic.value) {
        fn.apply(this, args);
    } else {
        setTimeout(() => fn.apply(this, args), 5);
    }
};

context.doWarp = function(isStart, context) {
    context.set(WARP_VAR, isStart);
};

context.doWait = function(duration, after) {
    var context = arguments[arguments.length-1],
        warpVar = context.get(WARP_VAR),
        isWarping = warpVar && warpVar.value === true;

    duration = duration || 0;
    if (duration === 0 && isWarping) {
        after();
    } else {
        setTimeout(after, duration*1000);
    }
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

///////////////////// Operators ///////////////////// 
context.reportEquals = function(left, right) {
    return left == right;
};

///////////////////// Variables ///////////////////// 
context.reportNewList = function() {
    var items = Array.prototype.slice.call(arguments);
    items.pop();  // (context)
    return items;
};

context.reportListLength = function(variable, context) {
    return variable ? variable.value.length : 0;
};

context.variable = function(name, context) {
    return context.get(name);
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

module.exports = context;
