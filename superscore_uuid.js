"use strict";

/*
 * Adapted from:
 * superscore uuid.js 0.2.2
 * (c) 2012 David Souther
 * superscore is freely distributable under the MIT license.
 * For all details and documentation:
 * https://github.com/DavidSouther/superscore
 *
 */
const crypto = require("crypto");
const rvalid = /^\{?[0-9a-f]{8}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{4}\-?[0-9a-f]{12}\}?$/i;

function sha1Hash(data) {
    const hasher = crypto.createHash("sha1");
    hasher.update(data);
    return hasher.digest("hex");
}

/**
 * Convert a string UUID to binary format.
 * @param {string} uuid The UUId to be converted
 * @returns {string} binary representation of the UUID
 */
function bin(uuid) {
    // Need a real UUID for this...
    if (!uuid.match(rvalid))
        return false;

    return new Buffer(uuid.replace(/[\-{}]/g, ""), "hex");
}

function uuidV5(msg, namespace) {
    /* eslint-disable no-magic-numbers, no-bitwise */
    const nst = bin(namespace || "00000000-0000-0000-0000-000000000000");

    const hash = sha1Hash(Buffer.concat([nst, new Buffer(msg, "utf-8")]));
    return [
        hash.substring(0, 8),  // 8 digits
        hash.substring(8, 12),  // 4 digits
        // four most significant bits holds version number 5
        (parseInt(hash.substring(12, 16), 16) & 0x0fff | 0x5000).toString(16),
        // two most significant bits holds zero and one for variant DCE1.1
        (parseInt(hash.substring(16, 20), 16) & 0x3fff | 0x8000).toString(16),
        hash.substring(20, 32),  // 12 digits
    ].join("-");
}

exports.uuid_v5 = uuidV5;
