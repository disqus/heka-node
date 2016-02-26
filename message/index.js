"use strict";

const path = require("path");

const ProtoBuf = require("protobufjs");

const builder = ProtoBuf.protoFromFile(path.join(__dirname, "../message.proto"));
const message = builder.build("message");

/** ********************************************/

// Constants useful for packing message bytes
/* eslint-disable no-magic-numbers */
exports.MAX_HEADER_SIZE = 255;
exports.MAX_MESSAGE_SIZE = 64 * 1024;
exports.RECORD_SEPARATOR = 0x1e;
exports.UNIT_SEPARATOR = 0x1f;
exports.UUID_SIZE = 16;
/* eslint-enable no-magic-numbers */

// Protocol Buffer definitions
exports.Message = message.Message;
exports.Header = message.Header;
exports.Field = message.Field;
