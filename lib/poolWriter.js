/* poolWriter.js
 */

var fs    = require('fs')
var util  = require('util')
var async = require('async')

var basedir = '/run/pool'

var global_config = {}

function spitError(message, err) {
    util.log(message)
    util.error(util.inspect(err, {colors: true}))
}

exports.setConfig = function setConfig(config) {
    global_config = config
}

exports.process = function process(err, data) {
    if (err) {
        util.log('Encountered an unknown error while polling services')
        return
    }

    var active  = {}

    data.filter(mustBeWorking).filter(mustBeActive).forEach(function(service) {
        if (active[service.intent] === undefined) {
            active[service.intent] = []
        }

        active[service.intent].push({
            name: service.name,
            addr: service.addr,
            port: service.port,
            hash: service.hash
        })
    })

    writeOutAll(active)
}

/* Every working (i.e. responding) service has replied with
 * an intent and a hash. Check that they are not null.
 */
function mustBeWorking(val) {
    return (val.intent && val.hash)
}

/* Active hashes are listed in global configuration. Check
 * that the hash is there.
 */
function mustBeActive(val) {
    return (val.hash in global_config)
}

/* Collect the file write operations to an array at let
 * async.parallel run with it.
 */
function writeOutAll(data) {
    var worklist = []

    for (var poolentry in data) {
        worklist.push(function(callback) {
            writeToFile(poolentry, getAddrAndPort(data[poolentry]))
            callback(null, poolentry)
        })
    }

    async.parallel(worklist, function(err) {
        if (err) {
            util.log('Encountered an unknown error while writing pool files')
        }
    })
}

/* Iterate through target hosts and return address:port
 * pairs for the pool file.
 */
function getAddrAndPort(pool) {
    var buffer = ''

    pool.forEach(function(target) {
        buffer += target.addr + ':' + target.port + '\n'
    })

    return buffer
}

/* Make an atomic write to pool file.
 */
function writeToFile(filename, buffer) {
    var tempfile = basedir + '/' + filename + '.tmp'
    var poolfile = basedir + '/' + filename + '.pool'

    try {
        fs.writeFileSync(tempfile, buffer, {
            encoding: 'utf8',
            mode: 0644
        })
    }
    catch (err) {
        spitError('Failed to write to file', err)
        return
    }

    try {
        fs.renameSync(tempfile, poolfile)
    }
    catch (err) {
        spitError('Failed to replace the previous pool file', err)
        return
    }
}
