"use strict";
/*
 * This is a simple HTTP server which responds to
 *
 *    http://localhost:8000/echo/<some_text_here>
 *
 * ex:
 *    http://localhost:8000/echo/blahblahblah
 *
 *
 * To view the data, you will need hekad running and listening on
 * localhost:5565 for UDP messages.
 *
 * A minimal hekad 0.2.0 configuration in TOML is:
 *
 * -----
 *    [UdpInput]
 *    address = "127.0.0.1:5565"
 *
 *    [LogOutput]
 *    message_matcher = "Type == 'counter' || Type == 'timer'"
 *    payload_only = false
 * -----
 *
 */

const restify = require("restify");
const heka = require("../client");

/* eslint-disable no-magic-numbers */
const HEKA_CONF = {
    stream: {
        factory: "./streams:udpStreamFactory",
        hosts: "localhost",
        ports: 4880,
    },
    logger: "test",
    severity: 5,
};
/* eslint-enable no-magic-numbers */
const log = heka.createClient(HEKA_CONF);

const server = restify.createServer({
    name: "myapp",
    version: "1.0.0",
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

function block(ms) {
    // naive cpu consuming "sleep", should never be used in real code
    const start = Date.now();
    let now;
    do {  // eslint-disable-line curly
        now = Date.now();
    } while (now - start < ms);
}

const echoHandler = function (request, response, next) {
    /* eslint-disable no-magic-numbers */
    // Send incr() messages 90% of the time
    log.incr("demo.node.incr_thing", { count: 2, my_meta: 42 }, 0.9);
    response.send(request.params);
    block(10);
    return next();
};

server.get("/echo/:name", log.timer(echoHandler, "timed_echo"));

server.listen(8000, function () {  // eslint-disable-line prefer-arrow-callback
    console.log("%s listening at %s", server.name, server.url);  // eslint-disable-line no-console
});
