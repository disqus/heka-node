"use strict";

const path = require("path");

const configModule = require("../config.js");
const heka = require("../client.js");
const msgHelpers = require("../message/helpers");

module.paths.push(path.resolve(".."));
const MOCK_STREAM_STRING = "./streams:debugStreamFactory";

const payloadIsFilterProvider = function (config) {
    const payloadIsFilter = function (msg) {
        return config.payload !== msg.payload;
    };
    return payloadIsFilter;
};
const PAYLOAD_IS_FILTER_STRING = "./tests/config.spec:payloadIsFilterProvider";

const showLoggerProvider = function (pluginConfig) {
    const label = pluginConfig.label || "logger";
    const showLogger = function () {
        return `${label}: ${this.logger}`;
    };
    return showLogger;
};
const SHOW_LOGGER_PROVIDER_STRING = "./tests/config.spec:showLoggerProvider";

function block(ms) {
    // naive cpu consuming "sleep", should never be used in real code
    const start = Date.now();
    let now;
    do {  // eslint-disable-line curly
        now = Date.now();
    } while (now - start < ms);
}

const sleeper = function () {
    block(20);
};

describe("config", function () {
    it("sets up a basic client", function () {
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            severity: 5,
        };
        const client = configModule.createClient(config);
        expect(client.logger).toEqual(config.logger);
        expect(client.severity).toEqual(config.severity);

        const msgOpts = { payload: "whadidyusay?" };
        const type = "test-type";

        client.heka(type, msgOpts);

        expect(client.stream.msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(client.stream.msgs.pop());
        const msg = decoded.message;
        expect(msg.type).toEqual(type);
        expect(msg.payload).toEqual(msgOpts.payload);
        expect(msg.severity).toEqual(config.severity);
    });

    it("sets up a client from an object as well as a string", function () {
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            severity: 5,
        };
        const client = configModule.createClient(config);
        expect(client.logger).toEqual(config.logger);
        expect(client.severity).toEqual(config.severity);

        const msgOpts = { "payload": "whadidyusay?" };
        const type = "test-type";

        client.heka(type, msgOpts);

        expect(client.stream.msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(client.stream.msgs.pop());
        const msg = decoded.message;
        expect(msg.type).toEqual(type);
        expect(msg.payload).toEqual(msgOpts.payload);
        expect(msg.severity).toEqual(config.severity);
    });

    it("sets up filters", function () {
        const filterConfig = { payload: "nay!" };
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            filters: [[PAYLOAD_IS_FILTER_STRING, filterConfig]],
        };
        const client = configModule.createClient(config);
        const filters = client.filters;

        expect(filters.length).toEqual(1);
        client.heka("test", { payload: "aye" });
        client.heka("test", { payload: "nay!" });
        expect(client.stream.msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(client.stream.msgs.pop());
        expect(decoded.message.payload).toEqual("aye");
    });

    it("sets up plugins", function () {
        const customLabel = "LOGGER, YO";
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            plugins: {
                showLogger: {
                    provider: SHOW_LOGGER_PROVIDER_STRING,
                    label: customLabel,
                },
            },
        };
        const client = configModule.createClient(config);
        expect(client._dynamicMethods.showLogger).not.toBe(undefined);
        expect(client.showLogger()).toEqual(`${customLabel}: test`);
    });

    it("honors plugin `override` settings", function () {
        const customLabel = "LOGGER, YO";
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            plugins: {
                incr: {
                    provider: SHOW_LOGGER_PROVIDER_STRING,
                    label: customLabel,
                },
            },
        };
        expect(() => configModule.createClient(config)).toThrow(
            new Error("The name incr is already in use")
        );

        config.plugins.incr.override = true;
        const client = configModule.createClient(config);
        expect(client._dynamicMethods.incr).not.toBe(undefined);
        expect(client.incr()).toEqual(`${customLabel}: test`);
    });

    it("raises errors when no factory attribute exists", function () {
        const config = {
            stream: {},
        };
        expect(() => configModule.createClient(config)).toThrow(
            new Error("factory attribute is missing from config")
        );
    });

    it("sets up filters and plugins", function () {
        const customLabel = "LOGGER, YO";
        const filterConfig = { payload: "nay!" };
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            filters: [[PAYLOAD_IS_FILTER_STRING, filterConfig]],
            plugins: {
                showLogger: {
                    provider: SHOW_LOGGER_PROVIDER_STRING,
                    label: customLabel,
                },
            },
        };
        const client = configModule.createClient(config);
        const filters = client.filters;
        expect(filters.length).toEqual(1);
        client.heka("test", { payload: "aye" });
        client.heka("test", { payload: "nay!" });
        expect(client.stream.msgs.length).toEqual(1);

        const decoded = msgHelpers.decodeMessage(client.stream.msgs.pop());
        const msg = decoded.message;

        expect(msg.payload).toEqual("aye");
        expect(client._dynamicMethods.showLogger).not.toBe(undefined);
        expect(client.showLogger()).toEqual(`${customLabel}: test`);
    });

    it("honors disabled timer wildcards", function () {
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            severity: 5,
            disabledTimers: ["*"],
        };
        const client = configModule.createClient(config);

        expect(client.disabledTimers.size).toEqual(1);
        expect(client.disabledTimers.has("*")).toBeTruthy();

        // wrap it
        const name = "disabled_timer_name";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;
        const wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        expect(client.stream.msgs.length).toEqual(0);
        wrappedSleeper();

        // No messages should pass through
        expect(client.stream.msgs.length).toEqual(0);
    });

    it("honors disabled timer lists of length 1", function () {
        const config = {
            stream: { factory: MOCK_STREAM_STRING },
            logger: "test",
            severity: 5,
            disabledTimers: ["some_disabled_type"],
        };
        const client = configModule.createClient(config);
        expect(client.disabledTimers.size).toEqual(1);
        expect(client.disabledTimers.has("some_disabled_type")).toBeTruthy();

        let name = "some_disabled_type";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;
        let wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        expect(client.stream.msgs.length).toEqual(0);
        wrappedSleeper();
        expect(client.stream.msgs.length).toEqual(0);

        name = "not_a_disabled_type";
        wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });

        wrappedSleeper();
        expect(client.stream.msgs.length).toEqual(1);
    });

    it("honors disabled timer lists", function () {
        const config = {
            stream: { "factory": MOCK_STREAM_STRING },
            logger: "test",
            severity: 5,
            disabledTimers: ["some_disabled_type", "some_other_disabled_type"],
        };
        const client = configModule.createClient(config);
        expect(client.disabledTimers.size).toEqual(2);
        expect(client.disabledTimers.has("some_disabled_type")).toBeTruthy();
        expect(client.disabledTimers.has("some_other_disabled_type")).toBeTruthy();

        let name = "some_disabled_type";
        const timestamp = heka.dateInNano(new Date(Date.UTC(2012, 2, 30)));  // eslint-disable-line new-cap
        const diffSeverity = 4;
        let wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });
        expect(client.stream.msgs.length).toEqual(0);
        wrappedSleeper();
        expect(client.stream.msgs.length).toEqual(0);

        name = "some_other_disabled_type";
        wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });

        wrappedSleeper();
        expect(client.stream.msgs.length).toEqual(0);

        name = "not_a_disabled_type";
        wrappedSleeper = client.timer(sleeper, name, {
            timestamp,
            severity: diffSeverity,
        });

        wrappedSleeper();
        expect(client.stream.msgs.length).toEqual(1);
    });
});

exports.payloadIsFilterProvider = payloadIsFilterProvider;
exports.showLoggerProvider = showLoggerProvider;
