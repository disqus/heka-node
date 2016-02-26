"use strict";

const ByteBuffer = require("bytebuffer");
const uuidV5 = require("./superscore_uuid.js").uuid_v5;

const NAMESPACE_OID = "6ba7b812-9dad-11d1-80b4-00c04fd430c8";

/*
 * Convert a hexadecimal UUID to a bytebuffer in read-only mode.
 */
function hex2Bin(uuid) {
    const hex = uuid.replace(/[\-{}]/g, "");
    const buffLen = hex.length / 2;
    const bb = new ByteBuffer(buffLen);

    // Convert each character to a bit
    for (let i = 0; i < hex.length; i += 2)
        bb.writeUint8(parseInt(hex.charAt(i) + hex.charAt(i + 1), 16));

    bb.flip();
    return bb;
}

/*
 * Compute a UUID based on object data
 */
function computeOidUUID(data) {
    return hex2Bin(uuidV5(data, NAMESPACE_OID));
}

exports.compute_oid_uuid = computeOidUUID;
exports.hex_to_bin = hex2Bin;
