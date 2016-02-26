"use strict";

const dgram = require("dgram");
const base = require("./base");

const UdpStream = function (hosts, ports, hmc) {
    this.init(hmc);

    if (!Array.isArray(hosts))
        hosts = [hosts];

    if (!Array.isArray(ports))
        ports = [ports];

    /*
     * Multiple host/port support is included.
     * We extend missing port numbers to the last port in the list
     */
    this._destination = hosts.map((host, i) => [host, ports[i] || ports[ports.length - 1]]);
    this.dgram = dgram;


    this._send_msg = function (buffer) {
        const client = this.dgram.createSocket("udp4");

        this._destination.forEach(elem => {
            const host = elem[0];
            const port = elem[1];
            // datagram sockets expect to write a Node.js Buffer object
            client.send(buffer, 0, buffer.length, port, host, (_err, _bytes) => {
                client.close();
            });
        });
    };

    this.toString = function ()
    {
        let result = "UdpStream ---\n";
        this._destination.forEach(elem => {
            const host = elem[0];
            const port = elem[1];
            result += `Destination : ${host}:${port}\n`;
        });
        result += "---UdpStream \n";
        return result;
    };
};
base.abstractStream.call(UdpStream.prototype);


const udpStreamFactory = function (config) {
    const hosts = config.hosts;
    const ports = config.ports;
    // const encoder = sender_config.encoder;
    const hmc = config.hmc;

    if (!(hosts && ports))
        throw new Error(`Invalid host/port combination: [${hosts}] [${ports}]`);

    return new UdpStream(hosts, ports, hmc);
};

exports.udpStreamFactory = udpStreamFactory;
