"use strict";

const fs = require("fs");
const base = require("./base");

const StdoutStream = function (_encoder, hmc) {
    this.stream = process.stdout;
    this.init(hmc);

    this._is_stdout = true;
    this._send_msg = function (text) {
        this.stream.write(text);
    };
};
base.abstractStream.call(StdoutStream.prototype);

const stdoutStreamFactory = function (conf) {
    const config = Object.assign({}, conf || {});
    return new StdoutStream(config.encoder, config.hmc);
};


const FileStream = function (filepath, _encoder, hmc) {
    this.stream = fs.createWriteStream(filepath);
    this.init(hmc);

    this._send_msg = function (msgBuffer) {
        this.stream.write(msgBuffer);
    };
};
base.abstractStream.call(FileStream.prototype);

const fileStreamFactory = function (conf) {
    const config = Object.assign({}, conf || {});
    return new FileStream(
        config.filepath,
        config.encoder,
        config.hmc
    );
};


const DebugStream = function (_encoder, hmc) {
    this.init(hmc);
    this.msgs = [];
    this._send_msg = function (text) {
        this.msgs.push(text);
    };
};
base.abstractStream.call(DebugStream.prototype);

const debugStreamFactory = function (conf) {
    const config = Object.assign({}, conf || {});
    return new DebugStream(config.encoder, config.hmc);
};


exports.fileStreamFactory = fileStreamFactory;
exports.stdoutStreamFactory = stdoutStreamFactory;
exports.debugStreamFactory = debugStreamFactory;
