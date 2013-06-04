#!/usr/bin/env nodejs

var util        = require('util')
var listHandler = require('./lib/listHandler')
var makeRequest = require('./lib/httpRequest').makeRequest
var writePool   = require('./lib/poolWriter').writePool

var config = {}
var stati  = {}

listHandler.init()

function hup() {
    util.log("Got sighup, reloading configuration")

    fetchConfig()
}

function poll() {
    fetchConfig()
    setInterval(pollServices, 5000)

    util.log("Started polling")
}

function fetchConfig() {
    var opt = {
        method: 'GET',
        host:   'puppetmaster.dicole.net',
        port:   80,
        path:   '/pool.config'
    }

    makeRequest(opt, updateConfig)
}

function updateConfig(opt, data) {
    data.split('\n').forEach(function(value, index) {
        var tmp = value.split(' ')
        var intent = tmp[0], hash = tmp[1]

        if (!valid(intent, hash)) return

        config[intent] = hash
    })
}

function pollServices() {
    for (var i in listHandler.theList) {
        var opt = {
            method: 'POST',
            host:   'localhost',
            port:   listHandler.theList[i],
            path:   '/pool'
        }

        makeRequest(opt, report)
    }

    writePool(config, stati)
}

function report(opt, result) {
    var tmp = result.split(' ')
    var intent = tmp[0], hash = tmp[1]
    var port = opt['port']

    if (!valid(intent, hash)) return

    if (stati[intent] === undefined) {
        stati[intent] = {}
    }

    stati[intent][port] = {
        'hash': hash,
        'time': new Date().getTime()
    }
}

function valid(intent, hash) {
    if (!intent.match(/^[a-z]+$/))  return false
    if (!hash.match(/^[0-9a-z]+$/)) return false

    return true
}

process.on('SIGHUP', hup)

poll()
