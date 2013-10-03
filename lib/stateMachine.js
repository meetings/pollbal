/*\
 *  stateMachine.js, handle the state of the services
 *  2013-10-03 / Meetin.gs
\*/

var _    = require('underscore')
var util = require('util')

var AtomicFS  = require('./atomicFS')
var Request   = require('./http').request
var ShellExec = require('./shellHook').exec

var Lock = true
var Active = []
var Conf = {}
var State = {}
var Signaling = {}

module.exports.handConfigOver = function(config) {
    Conf = config
    Active = Conf.active_services
    AtomicFS.setPoolDir(config.pool_directory)

    if (!_.isArray(Active)) {
        util.error("Active service configuration not found")
        Active = []
    }
}

module.exports.initialFlush = function() {
    var touched_files = []
    var existing_files = AtomicFS.readFileList()
    var warning_interval = 0

    for (var pool in State) {
        _.uniq(_.pluck(State[pool], 'vers')).forEach(function(vers) {
            touched_files.push(actualWrite(pool, vers))

            if (vers !== 'any') {
                touched_files.push(actualWrite(pool, 'any'))
            }
        })
    }

    _.difference(existing_files, touched_files).forEach(function(stale) {
        AtomicFS.remove(stale)
    })

    ShellExec(Conf.post_init_hook, {
        POLLBAL_POOL_DIRECTORY: Conf.pool_directory,
        POLLBAL_SERVICES_FILE:  Conf.services_file
    })

    if (_.has(Conf, 'pool_warning_interval')) {
        warning_interval = parseInt(Conf.pool_warning_interval, 10)
    }

    if (warning_interval > 0) {
        setInterval(function() {
            sendSignalsEverywhere(warning_interval)
        }, warning_interval)
    }

    Lock = false
}

function sendSignalsEverywhere(interval) {
    for (var pool in Signaling) {
        Signaling[pool].forEach(function(service) {
            process.nextTick(function() {
                sendSignalToService(service, interval)
            })
        })
    }
}

function sendSignalToService(service, interval) {
    /// debug("TONNE PITÄIS TUUPATA SIGNAALI", service)

    var opts = {
        uri:     'http://' + service.addr + ':' + service.port + '/pool_please_dont_go',
        method:  'POST',
        headers: { 'Cache-Control': 'no-cache' },
        timeout: interval
    }

    Request(opts, function() { return })
}

/*\
 *  Service responded succesfully. Mark it as available.
\*/
module.exports.success = function(pool, addr, port, vers, stat) {
    var update = false

    var service = {
        pool: pool,
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
        State[pool] = [service]
        debug("TILA lisääntyi", State)
    }
    else if (!State[pool].some(isSame)) {
        update = true
        State[pool].push(service)
        debug("TILA muuttui", State)
    }

    if (update) {
        poolHealthCheck(service)
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
            return (x.addr === addr && x.port === port)
        })

        if (_.isEmpty(bygone)) continue;

        State[key] = State[key].filter(function(x) {
            return !(x.addr === addr && x.port === port)
        })

        bygone.forEach(function(service) {
            poolHealthCheck(service)
            writePoolFiles(service)
        })
    }

    debug("TILA", State)
}

function poolHealthCheck(service) {
    var pool = service.pool
    var active = _.findWhere(Conf.active_services, {pool: pool})

    if (!_.has(active, 'required')) return

    var ok = State[pool].filter(areOK)
    var required = parseInt(active.required, 10)

    if (ok.length > required) {
        /// debug("RIITTÄÄ", ok.length + ' > ' + required)
        signal(pool, 0)
    }
    else {
        /// debug("EI RIITÄ :-(", ok.length + ' <= ' + required)
        signal(pool, required - ok.length + 1)
    }
}

function areOK(service) {
    return service.stat === 'ok'
}

function signal(pool, n) {
    if (!_.has(Signaling, pool) || n === 0) {
        Signaling[pool] = []
    }

    var more = n - Signaling[pool].length

    if (more > 0) {
        var available = _.difference(State[pool], Signaling[pool])
        if (available.length > 0) {
            Signaling[pool].push(_.sample(available))
        }
    }
    else if (more < n) {
        Signaling[pool] = _.sample(Signaling[pool], n)
    }

    debug("<> <> <> SIGNAL POOL <> <> <>", Signaling)
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

            if (service.vers !== 'any') {
                actualWrite(service.pool, 'any')
            }
        })
    }
}

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true})) /// debug
}
