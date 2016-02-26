"use strict";

const message = require("./index.js");
const ByteBuffer = require("bytebuffer");


const pushValue = function (isArray, fieldValue, val, v0) {
    if (isArray) {
        for (let i = 0; i < val.length; i++)
            fieldValue.push(val[i]);
    } else {
        fieldValue.push(v0);
    }
};

const isInt = function (num) {
    return typeof num === "number" && num % 1 === 0;
};

const isFloat = function (num) {
    return typeof num === "number" && num % 1 !== 0;
};

const dictToFields = function (fieldDict, prefix) {
    const results = [];
    for (const key in fieldDict) {
        if (!fieldDict.hasOwnProperty(key))
            continue;

        const val = fieldDict[key];
        const isArrayValue = Array.isArray(val);
        const v0 = isArrayValue ? val[0] : val;

        const field = new message.Field();

        field.name = prefix ? `${prefix}.${key}` : key;
        field.representation = "";

        if (isFloat(v0)) {
            field.value_type = message.Field.ValueType.DOUBLE;

            pushValue(isArrayValue, field.value_double, val, v0);

            results.push(field);
        } else if (isInt(v0)) {
            field.value_type = message.Field.ValueType.INTEGER;
            pushValue(isArrayValue, field.value_integer, val, v0);
            results.push(field);
        } else if (typeof v0 === "string") {
            field.value_type = message.Field.ValueType.STRING;
            pushValue(isArrayValue, field.value_string, val, v0);
            results.push(field);
        } else if (typeof v0 === "object") {
            dictToFields(v0, prefix = field.name);
        } else {
            field.value_type = message.Field.ValueType.BOOL;
            pushValue(isArrayValue, field.value_bool, val, v0);
            results.push(field);
        }
    }
    return results;
};

function decode(bytes) {
    /*
     * Decode the header and message object
     */
    const headerLen = bytes[1];
    const headerBuffer = bytes.slice(2, 2 + headerLen);

    //  Now double check the header
    const headerBB = ByteBuffer.wrap(headerBuffer);
    return {
        header: message.Header.decode(headerBB),
        message: message.Message.decode(ByteBuffer.wrap(bytes.slice(headerLen + 3))),
    };
}


exports.dictToFields = dictToFields;
exports.decodeMessage = decode;
