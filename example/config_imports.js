"use strict";

const showLoggerProvider = function (pluginConfig) {
    const label = pluginConfig.label || "logger";
    return function () {
        // This logging method just returns the label and logger name
        return `${label}: ${this.logger}`;
    };
};

const makeMockSender = function (senderConfig) {
    const mockSender = {
        foo: "bar",
        msgs: [],
        sendMessage(msg) {
            this.msgs.push(msg);
        },
        reset() {
            this.foo = "bar";
            this.msgs = [];
        },
    };

    if (senderConfig.foo)
        mockSender.foo = senderConfig.foo;

    return mockSender;
};

const payloadIsFilterProvider = function (config) {
    return function (msg) {
        return config.payload !== msg.payload;
    };
};

exports.makeMockSender = makeMockSender;
exports.payloadIsFilterProvider = payloadIsFilterProvider;
exports.showLoggerProvider = showLoggerProvider;
