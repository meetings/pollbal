/*\
 *  atomicFS.js, correctly handle filesystem operations
 *  2013-10-01 / Meetin.gs
\*/

var fs   = require('fs')
var util = require('util')

var basedir = null

module.exports.setPoolDir = function(dir) {
    basedir = dir
}

module.exports.readFileList = function() {
    return fs.readdirSync(basedir).filter(function(f) {
        return fs.statSync(basedir + '/' + f).isFile()
    })
}

module.exports.write = function(filename, buffer) {
    var tempfile = basedir + '/' + filename
    var poolfile = basedir + '/' + filename
    var opts = { encoding: 'utf8', mode: 0644 }

    try {
        fs.writeFileSync(tempfile, buffer, opts)
    }
    catch (err) {
        fail('Failed to write to file', err)
        return
    }

    try {
        fs.renameSync(tempfile, poolfile)
    }
    catch (err) {
        fail('Failed to replace the previous pool file', err)
        return
    }

    util.log('Updated: ' + filename)
}

/* FIXME Make this syncronous due race condition.
 */
module.exports.remove = function(filename) {
    var poolfile = basedir + '/' + filename

    fs.unlink(poolfile, function(err) {
        if (err) util.log('Failed to remove a file')
        else     util.log('Removed: ' + filename)
    })
}

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true})) /// debug
}
