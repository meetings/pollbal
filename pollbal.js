#!/usr/bin/env nodejs

var util        = require('util')
var async       = require('async')
var listHandler = require('./lib/listHandler')
var makeRequest = require('./lib/httpRequest').makeRequest
var poolWriter  = require('./lib/poolWriter')

var MAX_PARALLEL  = 3
var POLL_INTERVAL = 10 * 1000

listHandler.init()

function debug(msg, obj) {
    console.log("DEBUG :: " + msg + " ::")
    console.log(util.inspect(obj, {showHidden: true, depth: null, colors: true}))
}

function exit() {
    util.log("Caught sigint, exiting")

    process.exit(0)
}

function hup() {
    util.log("Caught sighup, reloading configuration")

    refreshConfig()
}

function init() {
    util.log("Polling shall commence")

    refreshConfig()
    setTimeout(pollServices, 1000)
}

function refreshConfig() {
    var opt = {
        method: 'GET',
        host:   'puppetmaster.dicole.net',
        port:   80,
        path:   '/pool.conf'
    }

    makeRequest(opt, updateConfig, 1000)
}

function updateConfig(data) {
    var config = {}

    data.split('\n').forEach(function(line) {
        var found = line.match(/^([a-z]+)\s([0-9a-f]{40})/)

        if (found) {
            config[found[2]] = found[1]
            // i.e. config.hash = intent
        }
    })

    poolWriter.setConfig(config)
}

function pollServices() {
    var worklist = []

    listHandler.theList.forEach(function(service) {
        worklist.push(function(callback) {
            var opt = {
                method: 'POST',
                host:   service.addr,
                port:   service.port,
                path:   '/pool'
            }

            makeRequest(opt, function(answer) {
                if (answer) {
                    var found = answer.match(/^([a-z]+)\s([0-9a-f]{40})/)
                }

                service['intent'] = found? found[1]: null
                service['hash']   = found? found[2]: null

                callback(null, service)
            })
        })
    })

    async.parallelLimit(worklist, MAX_PARALLEL, poolWriter.process)

    setTimeout(pollServices, POLL_INTERVAL)
}

process.on('SIGINT', exit)

process.on('SIGHUP', hup)

init()
