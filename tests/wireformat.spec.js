"use strict";

const streams = require("../streams");
const message = require("../message");

const Message = message.Message;


function getTestMessage() {
    const msg = new Message();
    msg.uuid = "0123456789012345";
    msg.type = "hmac";
    msg.timestamp = 1000000;
    return msg;
}

describe("Whole messages with HMAC signatures are computed", function () {
    it("with MD5 hmac", function () {
        const stream = streams.debugStreamFactory({
            hmc: {
                signer: "vic",
                key_version: 1,
                hash_function: "md5",
                key: "some_key",
            },
        });
        const msgs = stream.msgs;

        /* eslint-disable max-len */
        const expected = "1e1d081a1800220376696328013210bdc3319b9ae17adfcfeced2505cd396c1f0a0cd35db7e39ebbf3dd35db7e3910c0843d1a04686d61632807";
        /* eslint-enable max-len */

        const msg = getTestMessage();
        const msgBuffer = msg.toBuffer();
        expect(msgs.length).toEqual(0);
        stream.sendMessage(msgBuffer);
        expect(msgs.length).toEqual(1);
        expect(msgs.pop().toString("hex")).toEqual(expected);
    });


    it("with SHA1 hmac", function () {
        const stream = streams.debugStreamFactory({
            hmc: {
                signer: "vic",
                key_version: 1,
                hash_function: "sha1",
                key: "some_key",
            },
        });
        const msgs = stream.msgs;

        /* eslint-disable max-len */
        const expected = "1e21081a18012203766963280132144c783d08ff95d0db3983304348d1552506b1d1381f0a0cd35db7e39ebbf3dd35db7e3910c0843d1a04686d61632807";
        /* eslint-enable max-len */

        const msg = getTestMessage();
        const msgBuffer = msg.toBuffer();
        expect(msgs.length).toEqual(0);
        stream.sendMessage(msgBuffer);
        expect(msgs.length).toEqual(1);
        expect(msgs.pop().toString("hex")).toEqual(expected);
    });

});
