"use strict";

const message = require("../message");
const Header = message.Header;
const Message = message.Message;
const Field = message.Field;
const ProtoBuf = require("protobufjs");
const ByteBuffer = require("bytebuffer");

function getTestMessage() {
    const msg = new Message();
    const field = new Field();

    msg.uuid = "0123456789012345";
    msg.type = "demo";
    msg.timestamp = 1000000;
    field.name = "myfield";
    field.representation = "";
    msg.fields = [field];

    return msg;
}

function int64TSMsg(tsAsNS) {
    // This generate a message with an int64 timestamp
    const msg = new Message();
    msg.uuid = "0123456789012345";
    msg.type = "demo";
    msg.setTimestamp(tsAsNS);

    return msg;
}

const fieldTypeToField = {
    [Field.ValueType.STRING]: "value_string",
    [Field.ValueType.BYTES]: "value_bytes",
    [Field.ValueType.INTEGER]: "value_integer",
    [Field.ValueType.DOUBLE]: "value_double",
    [Field.ValueType.BOOL]: "value_bool",
};

function check(msg, expectedFieldType, expected) {
    const decoded = Message.decode(msg.encode());

    expect(decoded.fields.length).toEqual(1);
    expect(decoded.fields[0].value_type).toEqual(expectedFieldType);
    expect(expected(decoded.fields[0][fieldTypeToField[expectedFieldType]])).toBeTruthy();
}

describe("ProtocolBuffer", function () {
    const header = new Header();
    header.message_length = 11;
    header.hmac_hash_function = 0;

    it("messages can be decoded from Buffers", function () {
        const buff = header.toBuffer();

        const newHeader = Header.decode(buff);
        expect(newHeader).toEqual(header);
        expect(newHeader.message_length).toEqual(header.message_length);
    });

    describe("works with byte definitions", function () {
        it("with a constructor", function () {
            const strProto = "message Test { required bytes b = 0; }";
            const builder = ProtoBuf.protoFromString(strProto);
            const Test = builder.build("Test");
            const bb = new ByteBuffer(4).writeUint32(0x12345678).flip();

            // this isn't obvious at all as the example code in the
            // ProtobufJS testsuite passes the bb buffer right into
            // the constructor of Test which makes no sense at all

            // This is what's in the actual testcase
            // var myTest = new Test(bb);

            // This is what actually works
            let myTest = new Test({ b: bb });  // eslint-disable-line id-length

            expect(myTest.b.array).toEqual(bb.array);
            const bb2 = new ByteBuffer(6);
            myTest.encode(bb2);
            bb2.flip();
            expect(bb2.toDebug()).toEqual("<02 04 12 34 56 78>");
            myTest = Test.decode(bb2);
            expect(myTest.b.BE().readUint32()).toEqual(0x12345678);  // eslint-disable-line new-cap
        });

        it("with assignment", function () {
            const strProto = "message Test { required bytes b = 0; }";
            const builder = ProtoBuf.protoFromString(strProto);
            const Test = builder.build("Test");
            const bb = new ByteBuffer(4).writeUint32(0x12345678).flip();

            // this isn't obvious at all as the example code in the
            // ProtobufJS testsuite passes the bb buffer right into
            // the constructor of Test which makes no sense at all

            // This is what's in the actual testcase
            // var myTest = new Test(bb);

            // This is what actually works
            let myTest = new Test();
            myTest.b = bb;  // eslint-disable-line id-length

            expect(myTest.b.array).toEqual(bb.array);
            const bb2 = new ByteBuffer(6);
            myTest.encode(bb2);
            bb2.flip();
            expect(bb2.toDebug()).toEqual("<02 04 12 34 56 78>");
            myTest = Test.decode(bb2);
            expect(myTest.b.BE().readUint32()).toEqual(0x12345678);  // eslint-disable-line new-cap
        });

        it("with byte strings", function () {
            const strProto = "message Test { required bytes b = 0; }";
            const builder = ProtoBuf.protoFromString(strProto);
            const Test = builder.build("Test");
            const strBuffer = new Buffer("hello world");

            const myTest = new Test();
            myTest.b = ByteBuffer.wrap(strBuffer);  // eslint-disable-line id-length
            const expected = myTest.b.array;

            const jsbuf = myTest.encode().toArrayBuffer();
            const testCopy = Test.decode(jsbuf);
            const actual = testCopy.b.array;
            expect(actual).toEqual(expected);
        });
    });

});

describe("ProtocolBuffer msg serializes fields", function () {
    it("with string", function () {
        const msg = getTestMessage();
        const field = msg.fields[0];
        field.value_type = Field.ValueType.STRING;
        field.value_string.push("hello");

        check(msg, Field.ValueType.STRING, function (val) { return val[0] === "hello"; });
    });

    it("with bytes", function () {
        const msg = getTestMessage();
        const field = msg.fields[0];
        field.value_type = Field.ValueType.BYTES;
        field.value_bytes.push(new Buffer("some_bytes", "utf8"));

        check(msg, Field.ValueType.BYTES, function (val) {
            return val[0].toBuffer().toString("utf8") === "some_bytes";
        });
    });

    it("with integer", function () {
        const msg = getTestMessage();
        const field = msg.fields[0];
        field.value_type = Field.ValueType.INTEGER;
        field.value_integer.push(42);

        check(msg, Field.ValueType.INTEGER, function (val) { return val[0].toInt() === 42; });
    });

    it("with bool", function () {
        const msg = getTestMessage();
        const field = msg.fields[0];
        field.value_type = Field.ValueType.BOOL;
        field.value_bool.push(true);

        check(msg, Field.ValueType.BOOL, function (val) { return val[0] === true; });
    });

    it("with double", function () {
        const msg = getTestMessage();
        const field = msg.fields[0];
        field.value_type = Field.ValueType.DOUBLE;
        field.value_double.push(3.14);

        check(msg, Field.ValueType.DOUBLE, function (val) { return val[0] === 3.14; });
    });
});

describe("ProtocolBuffer msg timestamps", function () {
    it("with a full int64 value", function () {
        const tsAsNS = 133306560000000000;
        const msg = int64TSMsg(tsAsNS);
        const buff = msg.encode().toArrayBuffer();

        const newMsg = Message.decode(buff);
        expect(newMsg.timestamp.toNumber()).toEqual(tsAsNS);
    });
});
