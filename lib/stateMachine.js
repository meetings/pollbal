/*\
 *  stateMachine.js, handle the state of the services
 *  2013-10-01 / Meetin.gs
\*/

var _    = require('underscore')
var util = require('util')

var AtomicFS  = require('./atomicFS')
var ShellExec = require('./shellHook').exec

var Lock = true
var Conf = {}
var State = {}

module.exports.handConfigOver = function(config) {
    Conf = config
    AtomicFS.setPoolDir(config.pool_directory)
}

module.exports.initialFlush = function() {
    var touched = []
    var existing = AtomicFS.readFileList()

    for (var pool in State) {
        _.uniq(_.pluck(State[pool], 'vers')).forEach(function(v) {
            touched.push(actualWrite(pool, v))

            if (v != 'any') {
                touched.push(actualWrite(pool, 'any'))
            }
        })
    }

    _.difference(existing, touched).forEach(function(stale) {
        AtomicFS.remove(stale)
    })

    ShellExec(Conf.post_init_hook, {
        POLLBAL_POOL_DIRECTORY: Conf.pool_directory,
        POLLBAL_SERVICES_FILE:  Conf.services_file
    })

    Lock = false
}

/*\
 *  Service responded succesfully. Mark it as available.
\*/
module.exports.success = function(pool, addr, port, vers, stat, name) {
    var update = false

    var service = {
        addr: addr,
        port: port,
        vers: vers,
        stat: stat
    }

    var isSame = function(x) {
        return _.isEqual(x, service)
    }

    if (!_.has(State, pool)) {
        update = true
        State[pool] = []
        debug("TILA lisääntyi", State)
    }
    else if (!State[pool].some(isSame)) {
        update = true
        State[pool].push(service)
        debug("TILA muuttui", State)
    }

    if (update) {
        checkPoolStatus(service)
        writePoolFiles(service)
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

function checkPoolState() {
}

function actualWrite(pool, vers) {
    var buffer = ''
    var filename = util.format('%s__%s.pool', pool, vers)

    var env = {
        POLLBAL_POOL_DIRECTORY: Conf.pool_directory,
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

    return filename
}

function writePoolFiles(service) {
    if (!Lock) {
        process.nextTick(function() {
            actualWrite(service.pool, service.vers)

            if (service.vers != 'any') {
                actualWrite(service.pool, 'any')
            }
        })
    }
}

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true})) /// debug
}
