/*\
 *  shellHook.js, execute external commands
 *  2013-10-02 / Meetin.gs
 *
 *  Usage:
 *    shellHook.exec(command_array, additional_environment)
\*/

var _    = require('underscore')
var util = require('util')
var exec = require('child_process').spawn

module.exports.exec = function(cmdArr, envParam) {
    envParam = typeof envParam !== 'undefined'? envParam: {}

    if (!_.isArray(cmdArr)) return
    if ( _.isEmpty(cmdArr)) return

    var opts = {
        detached: true,
        env:      envMerge(envParam)
    }

    var cmd = cmdArr.shift()

    var child = exec(cmd, cmdArr, opts)

    child.unref()
}

function envMerge(obj) {
    var combined = {}
    for (var attr in process.env) { combined[attr] = process.env[attr] }
    for (var attr in obj) { combined[attr] = obj[attr] }
    return combined
}

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true})) /// debug
}
