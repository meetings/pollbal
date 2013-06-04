/* listHandler.js
 */

var fs       = require('fs')
var util     = require('util')
var stream   = require('stream')
var readline = require('readline')

var sourceFile = '/etc/pollbal.conf'

exports.theList = {}

exports.init = function init() {
    if (!fs.existsSync(sourceFile)) {
        util.log("Source list not found: " + sourceFile)
        process.exit(1)
    }

    fileChanged()
    fs.watch(sourceFile).on('change', fileChanged)
}

function fileChanged(e, f) {
    util.log("Reading service file")

    var instream = fs.createReadStream(sourceFile, { encoding: 'utf8'})

    var readlineOptions = {
        input:    instream,
        output:   new stream,
        terminal: false
    }

    var reader = readline.createInterface(readlineOptions)

    exports.theList = {}

    reader.on('line', parseLine)
}

function parseLine(line) {
    var parts = line.split(/\s+/)

    if (line.charAt(0) == '#') return
    if (parts.length <3) return

    if (parts.some(isInPool)) {
        exports.theList[parts[2]] = parts[0]
    }
}

function isInPool(element) {
    return element === 'servicepool'
}
