"use strict";

const streams = require("../streams");
const message = require("../message");
const msgHelpers = require("../message/helpers");

const Message = message.Message;
const Header = message.Header;

function getTestMessage() {
    const msg = new Message();
    msg.uuid = "0123456789012345";
    msg.type = "hmac";
    msg.timestamp = 1000000;
    return msg;
}

describe("HMAC signatures are computed", function () {
    const HMAC_CONF = {
        signer: "vic",
        key_version: 1,
        hash_function: "md5",
        key: "some_key",
    };

    const stream = streams.debugStreamFactory({ hmc: HMAC_CONF });

    const msgs = stream.msgs;

    beforeEach(function () {
        msgs.length = 0;
    });

    it("with MD5", function () {
        const msg = getTestMessage();
        const msgBuffer = msg.toBuffer();

        expect(msgs.length).toEqual(0);
        const streamBuffer = stream.sendMessage(msgBuffer);
        expect(msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(streamBuffer);
        const header = decoded.header;

        expect(header.hmac_signer).toEqual(HMAC_CONF.signer);
        expect(header.hmac_key_version).toEqual(HMAC_CONF.key_version);
        expect(header.hmac_hash_function).toEqual(Header.HmacHashFunction.MD5);
        expect(header.hmac.toBuffer().toString("hex")).toEqual("bdc3319b9ae17adfcfeced2505cd396c");
    });
});

describe("HMAC signatures are computed", function () {
    const HMAC_CONF = {
        signer: "vic",
        key_version: 1,
        hash_function: "sha1",
        key: "some_key",
    };

    const stream = streams.debugStreamFactory({ hmc: HMAC_CONF });

    const msgs = stream.msgs;

    beforeEach(function () {
        msgs.length = 0;
    });

    it("with SHA1", function () {
        const msg = getTestMessage();
        const msgBuffer = msg.toBuffer();

        expect(msgs.length).toEqual(0);
        const streamBuffer = stream.sendMessage(msgBuffer);
        expect(msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(streamBuffer);
        const header = decoded.header;

        expect(header.hmac_signer).toEqual(HMAC_CONF.signer);
        expect(header.hmac_key_version).toEqual(HMAC_CONF.key_version);
        expect(header.hmac_hash_function).toEqual(Header.HmacHashFunction.SHA1);
        expect(header.hmac.toBuffer().toString("hex")).toEqual("4c783d08ff95d0db3983304348d1552506b1d138");
    });

});
