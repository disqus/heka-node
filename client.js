"use strict";

const streams = require("./streams/index");
const config = require("./config");
const ENV_VERSION = "0.8";
const message = require("./message");
const helpers = require("./message/helpers");
const os = require("os");

const uuid = require("./uuid");
const computeOidUUID = uuid.compute_oid_uuid;
const dictToFields = helpers.dictToFields;

// Put a namespace around RFC 3164 syslog messages
/* eslint-disable no-magic-numbers */
const SEVERITY = {
    EMERGENCY: 0,
    ALERT: 1,
    CRITICAL: 2,
    ERROR: 3,
    WARNING: 4,
    NOTICE: 5,
    INFORMATIONAL: 6,
    DEBUG: 7,
};
/* eslint-enable no-magic-numbers */

function dateInNano(date) {
    // TODO: this needs to return an instance of Long.js's Long object
    // as JS doesn't support int64 out of the box
    const MILLISECONDS_IN_NANOSECOND = 1000000;
    return date.getTime() * MILLISECONDS_IN_NANOSECOND;
}

const HekaClient = function (stream, logger, severity, disabledTimers, filters) {
    this.setup(stream, logger, severity, disabledTimers, filters);
};

HekaClient.prototype.setup = function (stream, logger, severity, disabledTimers, filters ) {
    this.stream = stream;
    this.logger = logger || "";
    this.severity = severity || SEVERITY.INFORMATIONAL;
    this.disabledTimers = new Set(disabledTimers);
    this.filters = Array.isArray(filters) ? filters : [];
    this._dynamicMethods = {};

    this.pid = process.pid;
    this.hostname = os.hostname();
};

HekaClient.prototype._sendMessage = function (msgObj) {
    // Apply any filters and pass on the stream if message gets through
    if (this.filters.some(filter => !filter(msgObj)))
        return;

    this.stream.sendMessage(msgObj.toBuffer());
};

HekaClient.prototype.heka = function (type, opts) {
    const options = Object.assign({}, {
        timestamp: dateInNano(new Date()),
        logger: this.logger,
        severity: this.severity,
        payload: "",
        fields: {},
        pid: this.pid,
        hostname: this.hostname,
    }, opts || {});

    const msg = new message.Message();
    msg.timestamp = options.timestamp;

    msg.type = type;
    msg.logger = options.logger;
    msg.severity = options.severity;
    msg.payload = options.payload;

    msg.fields.push.apply(msg.fields, dictToFields(options.fields));

    msg.env_version = ENV_VERSION;
    msg.pid = options.pid;
    msg.hostname = options.hostname;

    msg.uuid = "0000000000000000";
    msg.uuid = computeOidUUID(msg.toBuffer());

    this._sendMessage(msg);
};

HekaClient.prototype.addMethod = function (name, method, override) {
    if (typeof method !== "function")
        throw new Error("`method` argument must be a function");

    if (!override && name in this)
        throw new Error(`The name ${name} is already in use`);

    this._dynamicMethods[name] = method;
    this[name] = method;
};

HekaClient.prototype.incr = function (name, opts, sampleRate) {
    // opts = count, timestamp, logger, severity, fields
    const options = Object.assign({}, {
        count: 1,
        fields: {},
    }, opts || {});

    if (typeof sampleRate === "undefined")
        sampleRate = 1;

    options.payload = String(options.count);
    options.fields.name = name;
    options.fields.rate = sampleRate;

    if (sampleRate <= Math.random())
        return;

    this.heka("counter", options);
};

HekaClient.prototype.timer_send = function (elapsed, name, opts) {
    // opts = timestamp, logger, severity, fields, rate
    const options = Object.assign({}, {
        rate: 1,
        fields: {},
    }, opts || {});

    if (options.rate <= Math.random())
        return;

    options.fields.name = name;
    options.fields.rate = options.rate;
    options.payload = String(elapsed);

    this.heka("timer", options);
};

HekaClient.prototype.timer = function (fn, name, opts) {
    const options = Object.assign({}, {
        rate: 1,
    }, opts || {});

    const noOpTimer = function () {
        return null;
    };

    // Check if this is a disabled timer
    if (this.disabledTimers.has(name) || this.disabledTimers.has("*"))
        return noOpTimer;

    if (options.rate <= Math.random())
        return noOpTimer;

    const _this = this;
    return function () {
        const startTime = Date.now();
        // The decorated function may yield during invocation
        // so the timer may return a higher value than the actual
        // execution time of *just* the decorated function
        const retVal = fn.apply(this, arguments);
        const elapsed = Date.now() - startTime;

        _this.timer_send(elapsed, name, opts);
        return retVal;
    };
};

HekaClient.prototype._oldStyle = function (severity, msg, opts) {
    const options = Object.assign({}, {
        fields: {},
        severity,
    }, opts || {});

    options.payload = String(msg);
    this.heka("oldstyle", options);
};

HekaClient.prototype.debug = function (msg, opts) {
    this._oldStyle(SEVERITY.DEBUG, msg, opts);
};

HekaClient.prototype.info = function (msg, opts) {
    this._oldStyle(SEVERITY.INFORMATIONAL, msg, opts);
};

HekaClient.prototype.warn = function (msg, opts) {
    this._oldStyle(SEVERITY.WARNING, msg, opts);
};

HekaClient.prototype.notice = function (msg, opts) {
    this._oldStyle(SEVERITY.NOTICE, msg, opts);
};

HekaClient.prototype.error = function (msg, opts) {
    this._oldStyle(SEVERITY.ERROR, msg, opts);
};

HekaClient.prototype.exception = function (msg, opts) {
    this._oldStyle(SEVERITY.ALERT, msg, opts);
};

HekaClient.prototype.critical = function (msg, opts) {
    this._oldStyle(SEVERITY.CRITICAL, msg, opts);
};



/** *************************/

exports.dateInNano = dateInNano;
exports.HekaClient = HekaClient;
exports.createClient = config.createClient;
exports.SEVERITY = SEVERITY;
exports.streams = streams;
