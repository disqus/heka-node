"use strict";

const configModule = require("../config.js");
const Message = require("../message").Message;

const makeMockStreamString = "./streams:debugStreamFactory";

describe("typeSeverityMax filter", function () {
    const msgs = [
        new Message({ "type": "foo", "severity": 0 }),
        new Message({ "type": "foo", "severity": 6 }),
        new Message({ "type": "bar", "severity": 0 }),
        new Message({ "type": "bar", "severity": 6 }),
    ];

    const typeSeverityMaxProvider = "./filters:typeSeverityMaxProvider";

    const filterConfig = { "types": { "foo": { "severity": 3 } } };
    let config = {
        stream: { factory: makeMockStreamString },
        logger: "test",
        severity: 5,
        filters: [[typeSeverityMaxProvider, filterConfig]],
    };

    it("allows (foo and severity > 3) | (any bar message)", function () {
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(3);
    });

    it("allows (foo and severity > 3) | (bar and severity > 3)", function () {
        filterConfig.types.bar = { severity: 3 };
        config = {
            stream: { "factory": makeMockStreamString },
            logger: "test",
            severity: 5,
            filters: [[typeSeverityMaxProvider, filterConfig]],
        };
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(2);
    });
});

describe("severityMax filter", function () {
    const msgs = [
        new Message({ "severity": 0 }),
        new Message({ "severity": 1 }),
        new Message({ "severity": 2 }),
        new Message({ "severity": 3 }),
        new Message({ "severity": 4 }),
        new Message({ "severity": 5 }),
        new Message({ "severity": 6 }),
        new Message({ "severity": 7 }),
    ];

    it("filters correctly", function () {
        const severityMaxProvider = "./filters:severityMaxProvider";
        msgs.forEach((_msg, i) => {
            const filterConfig = { "severity": i };
            const config = {
                "stream": { "factory": makeMockStreamString },
                "logger": "test",
                "severity": 5,
                "filters": [[severityMaxProvider, filterConfig]],
            };
            const client = configModule.createClient(config);

            expect(msgs.every((msg, j) => client.filters[0](msg) === j <= i)).toBeTruthy();
        });
    });
});

describe("typeBlacklist filter", function () {
    const msgs = [
        new Message({ "type": "foo" }),
        new Message({ "type": "bar" }),
        new Message({ "type": "baz" }),
        new Message({ "type": "bawlp" }),
    ];

    const typeBlacklistProvider = "./filters:typeBlacklistProvider";
    it("filters foo messages out", function () {
        const filterConfig = { types: { foo: 0 } };
        const config = {
            stream: { factory: makeMockStreamString },
            logger: "test",
            severity: 5,
            filters: [[typeBlacklistProvider, filterConfig]],
        };
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(3);
    });

    it("filters foo, bar and baz  messages out", function () {
        const filterConfig = { "types": { "foo": 0, "bar": 0, "baz": 0 } };
        const config = {
            stream: { factory: makeMockStreamString },
            logger: "test",
            severity: 5,
            filters: [[typeBlacklistProvider, filterConfig]],
        };
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(1);
    });
});

describe("typeWhitelist filter", function () {
    const msgs = [
        new Message({ "type": "foo" }),
        new Message({ "type": "bar" }),
        new Message({ "type": "baz" }),
        new Message({ "type": "bawlp" }),
    ];

    const typeWhitelistProvider = "./filters:typeWhitelistProvider";

    it("allows only foo messages", function () {
        const config = {
            stream: { factory: makeMockStreamString },
            logger: "test",
            severity: 5,
            filters: [[typeWhitelistProvider, { types: { foo: 0 } }]],
        };
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(1);
    });

    it("allows foo, bar and baz messages", function () {
        const filterConfig = { types: { foo: 0, bar: 0, baz: 0 } };
        const config = {
            stream: { factory: makeMockStreamString },
            logger: "test",
            severity: 5,
            filters: [[typeWhitelistProvider, filterConfig]],
        };
        const client = configModule.createClient(config);

        expect(msgs.filter(client.filters[0]).length).toEqual(3);
    });
});
