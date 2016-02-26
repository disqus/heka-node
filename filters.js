"use strict";

const severityMaxProvider = function (config) {
    return function (msg) {
        return msg.severity <= config.severity;
    };
};

const typeBlacklistProvider = function (config) {
    return function (msg) {
        return !(msg.type in config.types);
    };
};

const typeWhitelistProvider = function (config) {
    return function (msg) {
        return msg.type in config.types;
    };
};

const typeSeverityMaxProvider = function (config) {
    const typeFilters = {};
    for (const typeName in config.types) {
        if (config.types.hasOwnProperty(typeName))
            typeFilters[typeName] = severityMaxProvider(config.types[typeName]);
    }

    return function (msg) {
        const severityMax = typeFilters[msg.type];

        return !severityMax || severityMax(msg);
    };
};

exports.severityMaxProvider = severityMaxProvider;
exports.typeBlacklistProvider = typeBlacklistProvider;
exports.typeWhitelistProvider = typeWhitelistProvider;
exports.typeSeverityMaxProvider = typeSeverityMaxProvider;
