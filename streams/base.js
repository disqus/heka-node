"use strict";

const crypto = require("crypto");
const message = require("../message");


const abstractStream = function () {
    /*
     * This is an abstract stream which all streams should reuse.
     * Concrete Stream implementations must provide a _send_msg(buff)
     * method which accepts a Node.js Buffer object with a completely
     * serialized message (and header if your wireformat requires
     * one).
     */
    this.init = function (hmc) {
        if (hmc === undefined)
            this.hmc = null;
        else
            this.hmc = hmc;
    };

    this.buildHeader = function (msgBuffer) {
        const header = new message.Header();

        header.message_length = msgBuffer.length;
        if (this.hmc !== null) {
            const hmac = crypto.createHmac(this.hmc.hash_function, this.hmc.key);

            header.hmac_signer = this.hmc.signer;

            header.hmac_key_version = this.hmc.key_version;

            header.hmac_hash_function = message.Header.HmacHashFunction[this.hmc.hash_function.toUpperCase()];

            hmac.update(msgBuffer);
            header.hmac = hmac.digest();
        }

        return header;
    };


    this.sendMessage = function (msgBuffer) {
        /*
         * Wire format is:
         *
         * 1 byte : RECORD_SEPARATOR
         * 1 byte : HEADER_LENGTH
         * N bytes : header
         * 1 byte : UNIT_SEPARATOR
         * N bytes : message bytes
         */

        // Ensure we are going to use/hmac the buffer as it will be decoded by the client since they may differ
        // sometimes with the introduction of actual underlying types (Long, Buffers etc.)
        msgBuffer = message.Message.decode(msgBuffer).toBuffer();

        const header = this.buildHeader(msgBuffer);
        const headerBuffer = header.toBuffer();

        const buff = new Buffer(2);
        buff.writeUInt8(message.RECORD_SEPARATOR, 0);
        buff.writeUInt8(headerBuffer.length, 1);

        const unitBuffer = new Buffer(1);
        unitBuffer.writeUInt8(message.UNIT_SEPARATOR, 0);


        const finalBuffer = Buffer.concat([buff, headerBuffer, unitBuffer, msgBuffer]);

        // The implementation of send_msg should *not* alter the
        // content in anyway prior to transmission. This ensures that
        // switching to an alternate encoder is always safe.
        this._send_msg(finalBuffer);
        return finalBuffer;
    };
};

exports.abstractStream = abstractStream;
