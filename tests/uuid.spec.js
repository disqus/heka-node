"use strict";

const uuid = require("../uuid");

describe("uuid", function () {
    it("encodes hex to binary properly", function () {
        expect(uuid.hex_to_bin("0a1d").toDebug()).toEqual("<0A 1D>");
    });

    it("strips out non-hex characters before conversion to binary", function () {
        const actual = uuid.hex_to_bin("ba209999-0c6c-11d2-97cf-00c04f8eea45");
        const expected = "<BA 20 99 99 0C 6C 11 D2 97 CF 00 C0 4F 8E EA 45>";
        expect(actual.toDebug()).toEqual(expected);
    });

    it("writes bytebuffer correctly", function () {
        const bb = uuid.hex_to_bin("12345678-ffaabb12-01234567-890abcde");
        expect(bb.toDebug()).toEqual("<12 34 56 78 FF AA BB 12 01 23 45 67 89 0A BC DE>");
    });

});
