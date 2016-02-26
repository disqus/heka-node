"use strict";

const heka = require("../client.js");
const horaa = require("horaa");
const streams = require("../streams");
const udpHoraa = horaa("dgram");
const fsHoraa = horaa("fs");

const message = require("../message");
const Message = message.Message;

const msgHelpers = require("../message/helpers");

const path = require("path");
module.paths.push(path.resolve(".."));

const monkeyStdoutWrite = function (fakeWrite) {
    const origWrite = process.stdout.write;
    process.stdout.write = fakeWrite;

    return function () {
        process.stdout.write = origWrite;
    };
};

function getTestMessage() {
    const msg = new Message();
    msg.payload = "some payload content here";
    msg.timestamp = 100;
    msg.uuid = "0123456789012345";

    // Encode and decode once to force wrapped types like ByteBuffer an Long
    return Message.decode(msg.toBuffer());
}

function checkMessageBytes(wireBuffer, expectedMsgBuffer) {
    // Verification is a bit involved, we decode the bytes off the
    // wire and then re-encode the message portion to compare
    // *just* the message portion.

    const expectedMsgHex = expectedMsgBuffer.toString("hex");
    const wireMsgHex = msgHelpers.decodeMessage(wireBuffer).message.toBuffer().toString("hex");

    // All messages should be at least 5 bytes
    expect(wireBuffer.length).toBeGreaterThan(5);
    expect(expectedMsgBuffer.length).toBeGreaterThan(5);
    expect(wireMsgHex).toEqual(expectedMsgHex);
}

describe("StdoutStream configuration", function () {
    it("is loadable by config.js", function () {
        // Note that the stream factory string is non-standard as
        // we're running from a testcase.  You will normally need to
        // use something like 'heka:streams.udpStreamFactory' from
        // your own application
        const config = {
            stream: { factory: "./client:streams.stdoutStreamFactory" },
            logger: "test",
            severity: heka.SEVERITY.INFORMATIONAL,
        };
        const client = heka.createClient(config);
        expect(client.stream._is_stdout).toBeTruthy();
    });
});

describe("StdoutStream", function () {
    const msgs = [];
    const mockStdoutWrite = function (string/*, encoding, fd*/) {
        msgs.push(string);
    };
    let unhook;

    beforeEach(function () {
        msgs.length = 0;
        unhook = monkeyStdoutWrite(mockStdoutWrite);
    });

    afterEach(function () {
        unhook();
    });


    it("encodes messages", function () {
        const testMsg = getTestMessage();
        const stream = streams.stdoutStreamFactory();

        expect(msgs.length).toEqual(0);
        stream.sendMessage(testMsg.toBuffer());
        expect(msgs.length).toEqual(1);
        unhook();

        checkMessageBytes(msgs[0], testMsg.toBuffer());
    });
});

describe("UdpStream", function () {

    const mockUdpSocket = {
        msgs: [],
        hosts: [],
        ports: [],
        send(msg, _options, _length, port, host/*, callback*/) {
            this.msgs[this.msgs.length] = msg;
            this.hosts[this.hosts.length] = host;
            this.ports[this.ports.length] = port;
        },
        close() {},
    };

    const testMsg = getTestMessage();
    const expectedMsgBuffer = testMsg.toBuffer();

    beforeEach(function () {
        mockUdpSocket.msgs = [];
        mockUdpSocket.hosts = [];
        mockUdpSocket.ports = [];
        udpHoraa.hijack("createSocket", function (type) {
            if (type === "udp4")
                return mockUdpSocket;
        });
    });

    afterEach(function () {
        udpHoraa.restore("createSocket");
    });

    it("is loadable by config.js", function () {
        // Note that the stream factory string is non-standard as
        // we're running from a testcase.  You will normally need to
        // use something like 'heka:streams.udpStreamFactory' from
        // your own application
        const config = {
            "stream": {
                "factory": "./client:streams.udpStreamFactory",
                "hosts": ["localhost", "10.0.0.1"],
                "ports": [5565],
            },
            "logger": "test",
            "severity": heka.SEVERITY.INFORMATIONAL,
        };
        const client = heka.createClient(config);
        // The UDP configuration should have a dgram object
        expect(client.stream.dgram).not.toBeNull();
    });

    it("encodes messages", function () {
        const stream = streams.udpStreamFactory({
            hosts: "localhost",
            ports: 5565,
        });

        expect(mockUdpSocket.msgs.length).toEqual(0);
        stream.sendMessage(testMsg.toBuffer());
        expect(mockUdpSocket.msgs.length).toEqual(1);

        expect(mockUdpSocket.hosts[0]).toEqual("localhost");
        expect(mockUdpSocket.ports[0]).toEqual(5565);

        checkMessageBytes(mockUdpSocket.msgs.pop(), expectedMsgBuffer);
    });

    it("sends messages with more hosts than ports", function () {
        const stream = streams.udpStreamFactory({
            hosts: ["localhost", "10.0.0.1"],
            ports: 5565,
        });
        stream.sendMessage(testMsg.toBuffer());

        expect(mockUdpSocket.msgs.length).toEqual(2);

        checkMessageBytes(mockUdpSocket.msgs.pop(), expectedMsgBuffer);
        checkMessageBytes(mockUdpSocket.msgs.pop(), expectedMsgBuffer);

        expect(mockUdpSocket.hosts[0]).toEqual("localhost");
        expect(mockUdpSocket.hosts[1]).toEqual("10.0.0.1");
        expect(mockUdpSocket.ports[0]).toEqual(5565);
        expect(mockUdpSocket.ports[1]).toEqual(5565);
    });

    it("sends messages with hosts and ports", function () {
        const stream = streams.udpStreamFactory({
            hosts: ["localhost", "10.0.0.1"],
            ports: [2345, 5565],
        });

        stream.sendMessage(testMsg.toBuffer());

        expect(mockUdpSocket.msgs.length).toEqual(2);

        checkMessageBytes(mockUdpSocket.msgs.pop(), expectedMsgBuffer);
        checkMessageBytes(mockUdpSocket.msgs.pop(), expectedMsgBuffer);

        expect(mockUdpSocket.hosts[0]).toEqual("localhost");
        expect(mockUdpSocket.hosts[1]).toEqual("10.0.0.1");

        expect(mockUdpSocket.ports[0]).toEqual(2345);
        expect(mockUdpSocket.ports[1]).toEqual(5565);
    });
});

describe("FileStream", function () {
    const mockFileStream = {
        msgs: [],
        write(msgBuffer) {
            this.msgs.push(msgBuffer);
        },
        close() {},
    };

    beforeEach(function () {
        mockFileStream.msgs.length = 0;
        fsHoraa.hijack("createWriteStream", function (/* fpath */) {
            return mockFileStream;
        });
    });

    afterEach(function () {
        fsHoraa.restore("createWriteStream");
    });

    it("is loadable by config.js", function () {
        // Note that the stream factory string is non-standard as
        // we're running from a testcase. You will normally need to
        // use something like 'heka:streams.udpStreamFactory' from
        // your own application
        const config = {
            stream: {
                factory: "./client:streams.fileStreamFactory",
                filepath: "/tmp/some_path.txt",
            },
            logger: "test",
            severity: heka.SEVERITY.INFORMATIONAL,
        };
        const client = heka.createClient(config);

        expect(client.stream.filepath).not.toBeNull();
        expect(client.stream).not.toBeNull();
    });

    it("encodes messages", function () {
        const testMsg = getTestMessage();
        const testMsgBuffer = testMsg.toBuffer();
        const stream = streams.fileStreamFactory();

        expect(mockFileStream.msgs.length).toEqual(0);
        stream.sendMessage(testMsgBuffer);
        expect(mockFileStream.msgs.length).toEqual(1);

        checkMessageBytes(mockFileStream.msgs.pop(), testMsgBuffer);
    });
});
