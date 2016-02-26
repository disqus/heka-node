"use strict";

const os = require("os");
const path = require("path");
const Long = require("long");
const heka = require("../client.js");

const resolver = require("../resolver");
const resolveName = resolver.resolveName;

const helpers = require("../message/helpers");

module.paths.push(path.resolve(".."));


describe("client", function () {
    function makeMockStream() {
        return resolveName("./streams:debugStreamFactory")({});
    }
    let mockStream = null;

    const loggerVal = "bogus";
    let client;

    beforeEach(function () {
        // Blow away the mockstream and recreate it
        mockStream = makeMockStream();

        client = new heka.HekaClient(mockStream,
            loggerVal,
            heka.SEVERITY.INFORMATIONAL,
            ["disabled_timer_name"]
            );

    });

    function msgFromStream(stream) {
        return helpers.decodeMessage(stream.msgs.pop()).message;
    }

    function checkSimpleField(msg, name) {
        if (!name) {
            expect(msg.fields.length).toEqual(0);
            return;
        }

        const nameField = msg.fields[0];
        const rateField = msg.fields[1];
        expect(nameField.value_string[0]).toEqual(name);
        expect(rateField.value_integer[0].toInt()).toEqual(1);
    }

    function block(ms) {
        // naive cpu consuming "sleep", should never be used in real code
        const start = new Date();
        let now;
        do {  // eslint-disable-line curly
            now = new Date();
        } while (now - start < ms);
    }

    function typeFilter(msg) {
        return !(msg.type in { foo: 0, bar: 0 });
    }

    it("initializes correctly", function () {
        expect(client.stream).toEqual(mockStream);
        expect(client.logger).toEqual(loggerVal);
        expect(client.severity).toEqual(6);
    });

    it("initializes w alternate defaults", function () {
        const otherLoggerVal = "sugob";
        const otherSeverity = 3;
        const otherClient = new heka.HekaClient(mockStream, otherLoggerVal, otherSeverity);
        expect(otherClient.stream).toBe(mockStream);
        expect(otherClient.logger).toEqual(otherLoggerVal);
        expect(otherClient.severity).toEqual(otherSeverity);
    });

    it("delivers to stream", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const type = "vanilla";
        const payload = "drippy dreamy icy creamy";
        client.heka(type, { timestamp, payload });
        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);
        expect(msg.type).toEqual(type);

        // Timestamps in nanoseconds requires
        // int64 precision which needs to explicitly use the Long
        // library or else you're going to have pain
        expect(msg.timestamp.toString()).toEqual(Long.fromNumber(timestamp).toString());

        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());
        expect(msg.severity).toEqual(6);
        expect(msg.payload).toEqual(payload);

        checkSimpleField(msg);
    });

    it("sends incr message", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const name = "counter name";
        client.incr(name, { timestamp });
        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);

        expect(msg.type).toEqual("counter");

        expect(msg.timestamp.toNumber()).toEqual(timestamp);

        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());
        expect(msg.severity).toEqual(6);

        checkSimpleField(msg, name);

        expect(msg.payload).toEqual("1");
    });

    it("formats nanosecond dates properly", function () {
        // These 3 are all equivalent timestamps
        const myDate = new Date(Date.UTC(2012, 2, 30));
        const numTSinNS = myDate.getTime() * 1000000;  // eslint-disable-line no-magic-numbers
        const strTSinNS = String(numTSinNS);

        expect(heka.dateInNano(myDate)).toEqual(numTSinNS);  // eslint-disable-line new-cap
        expect(Long.fromString(strTSinNS).toString()).toEqual(strTSinNS);
        expect(Long.fromString(strTSinNS).toNumber()).toEqual(numTSinNS);
    });

    it("sends incr different count", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const name = "counter name";
        const count = 3;
        client.incr(name, { timestamp, count });
        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("counter");
        expect(msg.timestamp.toNumber()).toEqual(timestamp);
        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());
        expect(msg.severity).toEqual(6);

        checkSimpleField(msg, name);

        expect(msg.payload).toEqual("3");
    });

    it("sends timed message", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const name = "timed name";
        const elapsed = 35;
        const diffLogger = "different";
        client.timer_send(elapsed, name, {
            timestamp,
            logger: diffLogger,
        });

        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("timer");
        expect(msg.timestamp.toNumber()).toEqual(timestamp);
        expect(msg.logger).toEqual(diffLogger);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());
        expect(msg.severity).toEqual(6);
        checkSimpleField(msg, name);
        expect(msg.payload).toEqual(String(elapsed));
    });

    it("honors incr rate", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const name = "counter name";
        const rate = 0.1;
        const repeats = 1000;
        for (let i = 0; i < repeats; i++)
            client.incr(name, { timestamp }, rate);

        // this is a very weak test, w/ a small probability of failing incorrectly :(
        // we shouldn't get *twice* as many messages as the upper
        // limit
        expect(mockStream.msgs.length).toBeLessThan(repeats * rate * 2);
        expect(mockStream.msgs.length).toBeGreaterThan(0);
    });

    it("honors timer rate", function () {
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const name = "timed name";
        const elapsed = 35;
        const rate = 0.1;
        const repeats = 1000;
        for (let i = 0; i < repeats; i++)
            client.timer_send(elapsed, name, { timestamp, rate });
        // this is a very weak test, w/ a small probability of failing incorrectly :(

        // we shouldn't get *twice* as many messages as the upper limit
        expect(mockStream.msgs.length).toBeLessThan(repeats * rate * 2);
        expect(mockStream.msgs.length).toBeGreaterThan(0);
    });

    it("can use no options with timer calls", function () {
        const minWait = 40;  // in milliseconds
        const sleeper = block.bind(this, minWait);
        const name = "decorator";

        // wrap it
        const sleepTimer = client.timer(sleeper, name);
        sleepTimer();

        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("timer");
        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());

        // Default severity
        expect(msg.severity).toEqual(heka.SEVERITY.INFORMATIONAL);

        checkSimpleField(msg, name);

        const elapsed = parseInt(msg.payload, 10);
        expect(elapsed >= minWait).toBeTruthy();
    });

    it("decorates w/ timer correctly", function () {
        const minWait = 40;  // in milliseconds
        let sleeper = block.bind(this, minWait);
        const name = "decorator";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;
        // wrap it
        sleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        sleeper();
        expect(mockStream.msgs.length).toEqual(1);

        let msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("timer");
        expect(msg.timestamp.toNumber()).toEqual(timestamp);
        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);
        expect(msg.hostname).toEqual(os.hostname());
        expect(msg.severity).toEqual(diffSeverity);
        checkSimpleField(msg, name);

        const elapsed = parseInt(msg.payload, 10);
        expect(elapsed >= minWait).toBeTruthy();

        sleeper();
        expect(mockStream.msgs.length).toEqual(1);
        msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("timer");
        expect(msg.timestamp.toNumber()).toEqual(timestamp);
        expect(msg.logger).toEqual(loggerVal);
        expect(msg.pid).toEqual(process.pid);

        expect(msg.hostname).toEqual(os.hostname());

        expect(msg.severity).toEqual(diffSeverity);

        checkSimpleField(msg, name);
        expect(elapsed >= minWait).toBeTruthy();
    });

    it("supports filter functions", function () {
        client.filters = [typeFilter];
        client.heka("foo");
        client.heka("baz");
        client.heka("bar");
        client.heka("bawlp");
        expect(mockStream.msgs.length).toEqual(2);

        // Messages are popped in reverse order
        const msg2 = msgFromStream(mockStream);
        const msg1 = msgFromStream(mockStream);

        expect(msg1.type).toEqual("baz");
        expect(msg2.type).toEqual("bawlp");
    });

    it("supports dynamic methods", function () {
        const sendFoo = function (msg) {
            this.heka("foo", { payload: `FOO: ${msg}` });
        };
        client.addMethod("sendFoo", sendFoo);
        expect(client._dynamicMethods).toEqual({ sendFoo });
        client.sendFoo("bar");
        expect(mockStream.msgs.length).toEqual(1);

        const msg = msgFromStream(mockStream);
        expect(msg.type).toEqual("foo");
        expect(msg.payload).toEqual("FOO: bar");
    });

    it("overrides properties correctly", function () {
        const sendFoo = function (msg) {
            this.heka("foo", { payload: `FOO: ${msg}` });
        };
        expect(function () {
            client.addMethod("incr", sendFoo);
        }).toThrow(new Error("The name incr is already in use"));

        client.addMethod("incr", sendFoo, true);
        client.incr("bar");
        expect(mockStream.msgs.length).toEqual(1);
        const msg = msgFromStream(mockStream);

        expect(msg.type).toEqual("foo");
        expect(msg.payload).toEqual("FOO: bar");
    });

    it("provides simple oldstyle logging methods", function () {
        const msgPairs = [[client.debug, "debug_msg", heka.SEVERITY.DEBUG],
        [client.info, "info_msg", heka.SEVERITY.INFORMATIONAL],
        [client.warn, "warn_msg", heka.SEVERITY.WARNING],
        [client.notice, "not_msg", heka.SEVERITY.NOTICE],
        [client.error, "err_msg", heka.SEVERITY.ERROR],
        [client.exception, "exc_msg", heka.SEVERITY.ALERT],
        [client.critical, "crit_msg", heka.SEVERITY.CRITICAL]];

        msgPairs.forEach(elem => {
            const method = elem[0];
            const data = elem[1];
            const severity = elem[2];
            method.call(client, data);

            const msg = msgFromStream(client.stream);
            expect(msg.payload).toEqual(data);
            expect(msg.severity).toEqual(severity);
        });

        expect(client.stream.msgs.length).toEqual(0);
    });

    it("honors disabledTimers", function () {
        const minWait = 40;  // in milliseconds
        let sleeper = block.bind(this, minWait);
        const name = "disabled_timer_name";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;

        // wrap it
        sleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        sleeper();
        expect(mockStream.msgs.length).toEqual(0);
    });

    it("honors wildcard disabledTimers", function () {
        client = new heka.HekaClient(mockStream,
            loggerVal,
            heka.SEVERITY.INFORMATIONAL,
            ["*"]
            );
        const minWait = 40;  // in milliseconds
        let sleeper = block.bind(this, minWait);
        const name = "any timer name";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;
        // wrap it
        sleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        // call it
        sleeper();
        expect(mockStream.msgs.length).toEqual(0);
    });
});
