"use strict";

const configModule = require("../config.js");
const makeMockStreamString = "./streams:debugStreamFactory";

const showLoggerProvider = function (pluginConfig) {
    const label = pluginConfig.label || "logger";
    return function () {
        return `${label}: ${this.logger}`;
    };
};
const showLoggerProviderString = "./tests/plugins.spec.js:showLoggerProvider";

describe("showLoggerProvider plugin", function () {
    it("is loadable", function () {
        const customLabel = "LOGGER, YO";
        const config = {
            stream: { factory: makeMockStreamString },
            logger: "test",
            plugins: {
                showLogger: {
                    provider: showLoggerProviderString,
                    label: customLabel,
                },
            },
        };
        const client = configModule.createClient(config);
        expect(client._dynamicMethods.showLogger).not.toBe(undefined);
        expect(client.showLogger()).toEqual(`${customLabel}: test`);
    });
});

exports.showLoggerProvider = showLoggerProvider;
