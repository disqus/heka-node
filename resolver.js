"use strict";

/*
* Fetch a module attribute by name and return the actual object (usually
* a function) to which the name refers.
*
* @param {string} name String referring to the callable. Should consist of a module
*                      name (can be a bare name or a file path, anything that will
*                      work with `require`) and an exported module attribute name
*                      separated by a colon. For example, this function itself would
*                      be specified by './config:resolveName'.
*/
const resolveName = function (name) {
    const pieces = name.split(":");
    const fnPath = pieces[1].split(".");

    const fn = fnPath.reduce(
        (result, piece) => result[piece],
        require(pieces[0])  // eslint-disable-line global-require
    );

    if (!fn)
        throw new Error(`ERROR loading: [${pieces[0]}:${pieces[1]}]. Make sure you've exported it properly.`);

    return fn;
};

exports.resolveName = resolveName;
