"use strict";

const heka = require("heka");

const config = {
    sender: { factory: "./example/config_imports:makeMockSender" },
    logger: "test",
    severity: heka.SEVERITY.INFORMATIONAL,
    disabledTimers: ["disabled_timer_name"],
    filters: [["./example/config_imports:payloadIsFilterProvider", { payload: "nay!" }]],
    plugins: {
        showLogger: {
            provider: "./example/config_imports:showLoggerProvider",
            label: "some-label-thing",
        },
    },
};

const client = heka.createClient(config);

console.log(client);  // eslint-disable-line no-console
