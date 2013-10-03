/*\
 *  atomicFS.js, correctly handle filesystem operations
 *  2013-10-03 / Meetin.gs
\*/

var fs   = require('fs')
var util = require('util')

var Basedir = null

module.exports.setPoolDir = function(dir) {
    if (fs.statSync(dir).isDirectory()) {
        Basedir = dir
    }
    else {
        util.log("!!! Configured pool directory is not a directory")
    }
}

module.exports.readFileList = function() {
    return fs.readdirSync(Basedir).filter(function(f) {
        return fs.statSync(Basedir + '/' + f).isFile()
    })
}

module.exports.write = function(filename, buffer) {
    var tempfile = Basedir + '/' + filename
    var poolfile = Basedir + '/' + filename
    var opts = { encoding: 'utf8', mode: 0644 }

    try {
        fs.writeFileSync(tempfile, buffer, opts)
    }
    catch (err) {
        util.log("!!! Failed to write to file " + filename)
        return
    }

    try {
        fs.renameSync(tempfile, poolfile)
    }
    catch (err) {
        util.log("!!! Failed to replace a previous pool file")
        return
    }

    util.log('Updated ++ ' + filename)
}

module.exports.remove = function(filename) {
    try {
        fs.unlinkSync(Basedir + '/' + filename)
        util.log('Removed -- ' + filename)
    }
    catch (err) {
        util.log("!!! Failed to remove file " + filename)
    }
}
