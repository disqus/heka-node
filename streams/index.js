"use strict";
const dev = require("./dev.js");
const udp = require("./udp.js");

exports.debugStreamFactory = dev.debugStreamFactory;
exports.fileStreamFactory = dev.fileStreamFactory;
exports.stdoutStreamFactory = dev.stdoutStreamFactory;
exports.udpStreamFactory = udp.udpStreamFactory;
