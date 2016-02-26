"use strict";
const clientModule = require("./client");
const resolver = require("./resolver");

const resolveName = resolver.resolveName;

const streamFromConfig = function (config) {
    if (!config.factory)
        throw new Error("factory attribute is missing from config");

    const streamFactory = resolveName(config.factory);
    if (!streamFactory)
        throw new Error(`Unable to resolve the streamFactory: [${config.factory}]`);

    return streamFactory(config);
};

const createClient = function (config, client) {
    const streamConfig = config.stream || {};
    const stream = streamFromConfig(streamConfig);
    const logger = config.logger;
    const severity = config.severity;
    const disabledTimers = config.disabledTimers || new Set();
    const plugins = config.plugins || {};

    const filterNames = config.filters || [];
    const filters = filterNames.map(filter => resolveName(filter[0])(filter[1]));

    if (client)
        client.setup(stream, logger, severity, disabledTimers, filters);
    else
        client = new clientModule.HekaClient(stream, logger, severity, disabledTimers, filters);

    for (const name in plugins) {
        if (!plugins.hasOwnProperty(name))
            continue;

        const pluginConfig = plugins[name];
        client.addMethod(
            name,
            resolveName(pluginConfig.provider)(pluginConfig),
            pluginConfig.override
        );
    }

    return client;
};

exports.resolveName = resolveName;
exports.createClient = createClient;
