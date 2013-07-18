/*\
 *  stateWriter.js, handle the state of the services
 *  2013-09-30 / Meetin.gs
\*/

var _    = require('underscore')
var util = require('util')

var AtomicFS  = require('./atomicFS')
var ShellExec = require('./lib/shellHook').exec

var State = {}
var PoolDir = ''

module.exports.setPoolDir = function(dir) {
    PoolDir = dir
    AtomicFS.setPoolDir(dir)
}

/*\
 *  Service responded succesfully. Mark it as available.
\*/
module.exports.success = function(pool, addr, port, vers, stat, name) {
    var update = null

    var service = {
        addr: addr,
        port: port,
        vers: vers,
        name: name
    }

    var isSame = function(x) {
        return _.isEqual(x, service)
    }

    if (!_.has(State, pool)) {
        update = { pool: pool, vers: vers }
        State[pool] = []
    }

    if (!State[pool].some(isSame)) {
        update = { pool: pool, vers: vers }
        State[pool].push(service)
    }

    /// debug("TILA", State)

    if (update) {
        writePoolFiles(update)
    }
}

/*\
 *  Service failed to respond or gave a wrong responce.
 *  It should be considered invalid.
\*/
module.exports.fail = function(addr, port) {
    for (var key in State) {
        var bygone = State[key].filter(function(x) {
            return (x.addr == addr && x.port == port)
        })

        if (_.isEmpty(bygone)) continue;

        State[key] = State[key].filter(function(x) {
            return !(x.addr == addr && x.port == port)
        })

        bygone.forEach(function(service) {
            writePoolFiles({ pool: key, vers: service.vers })
        })
    }

    /// debug("TILA", State)
}

function actualWrite(pool, vers) {
    var buffer = ''
    var filename = util.format('%s__%s.pool', pool, vers)

    var env = {
        POLLBAL_POOL_DIRECTORY: PoolDir,
        POLLBAL_FILE_NAME:      filename
    }

    State[pool].forEach(function(service) {
        buffer += util.format('%s:%s\n', service.addr, service.port)
    })

    if (_.isEmpty(buffer)) {
        AtomicFS.remove(filename)
        ShellExec(Conf.file_remove_hook, env)
    }
    else {
        AtomicFS.write(filename, buffer)
        ShellExec(Conf.file_update_hook, env)
    }
}

function writePoolFiles(service) {
    process.nextTick(function() {
        actualWrite(service.pool, service.vers)

        if (service.vers != 'any') {
            actualWrite(service.pool, 'any')
        }
    })
}

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true})) /// debug
}
