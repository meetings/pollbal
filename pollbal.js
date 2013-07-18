#!/usr/bin/env nodejs

/*\
 *  pollbal.js
 *  2013-09-30 / Meetin.gs
\*/

var _    = require('underscore')
var fs   = require('fs')
var util = require('util')

var Request      = require('./lib/http').request
var GetServices  = require('./lib/getServices').getServices
var StateMachine = require('./lib/stateWriter')
var ShellExec    = require('./lib/shellHook').exec

var Conf         = require('/etc/pollbal.json')


/* * * ACTUAL POLLING * * * * * * * * * */

function pollService(service) {
    var opts = {
        uri:     'http://' + service.addr + ':' + service.port + '/pool',
        headers: { 'Cache-Control': 'no-cache' },
        timeout: Conf.service_timeout
    }

    Request(opts, function(err, reply) {
        var data = parseReply(reply)

        if (err || data.pool == null) {
            StateMachine.fail(service.addr, service.port)
        }
        else {
            StateMachine.success(
                data.pool, service.addr, service.port,
                data.vers, data.stat, service.name
            )
        }

        setTimeout(function() { pollService(service) }, Conf.poll_interval)
    })
}

/*\
 *  Parse a reply of the form:
 *    < pool > [ status [ version ] ]
 *  Where:
 *    pool is a name of the pool [a-z]
 *    status may be "ok" or "brb?"
 *    version may be a hash, a semver or "any"
\*/
function parseReply(reply) {
    /// debug("reply()", reply)

    var parts = null

    var valid = {
        pool: null,
        stat: 'ok',
        vers: 'any'
    }

    if (reply == null) {
        return valid
    }
    else if (_.isString(reply)) {
        var parts = reply.split(/\s+/)
    }
    else {
        return valid
    }

    if (parts.length == 0) return valid

    if (parts.length > 0) {
        if (/^[\w\-]+$/.test(parts[0])) {
            valid.pool = parts[0]
        }
    }

    if (parts.length > 1) {
        if (_.contains(['exiting', 'leaving', 'quitting'], parts[1])) {
            valid.stat = 'exiting'
        }
    }

    if (parts.length > 2) {
        if (/^[\w\.]+$/.test(parts[2])) {
            valid.vers = parts[2]
        }
    }

    return valid
}


/* * * INIT AND QUIT  * * * * * * * * * */

function wishfulQuit() {
    ShellExec(Conf.pre_quit_hook)
    process.exit(0)
}

function randomInt(min, max) {
    return Math.round(Math.random() * (max - min) + min)
}

function jsonWrite(json) {
    fs.writeFileSync(
        '/etc/pollbal.json', JSON.stringify(json), { encoding: 'utf8' }
    )
}

function upgradeConfig() {
    var upgrade = {}
    var opts = { uri: Conf.remote_config_url }

    http.request(opts, function(err, data) {
        try {
            upgrade = JSON.parse(data)
        }
        catch (err) {
            util.error("Failed to parse remote configuration upgrade")
        }

        if (!_.isEqual(Conf, upgrade)) {
            util.log("Upgrading configuration")
            jsonWrite(upgrade)
            wishfulQuit()
        }
    })
}

function init() {
    util.log("Pollbal initializing")

    if (Conf.remote_config_url) {
        if (Conf.remote_config_interval) {
            util.log(util.format(
                "Checking configuration upgrade every %s ms",
                Conf.remote_config_interval
            ))
            setTimeout(upgradeConfig, Conf.remote_config_interval)
        }
        else {
            util.log("Trying remote configuration upgrade")
            upgradeConfig()
        }
    }

    StateMachine.setPoolDir(Conf.pool_directory)

    var services = GetServices(Conf.services_file, wishfulQuit)

    if (services == null) {
        util.log("Failed to read machinae information")
        process.exit(1)
    }

    ShellExec(Conf.post_init_hook, {
        POLLBAL_POOL_DIRECTORY: Conf.pool_directory,
        POLLBAL_SERVICES_FILE:  Conf.services_file
    })

    services.forEach(function(s) {
        /* Start polling threads with some initial jitter to
         * avoid making all the http requests at the same time.
         */
        setTimeout(function() { pollService(s) }, randomInt(1, Conf.poll_interval))
    })
}

process.on('SIGHUP', wishfulQuit)

init()

function debug(msg, obj) {
    if (_.isUndefined(obj)) obj = null
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true}))
}
