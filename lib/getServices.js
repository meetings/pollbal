/*\
 *  getServices.js, return the list of pollable services
 *
 *  2013-10-02 / Meetin.gs
 *
 *  Usage:
 *    getServices.getServices(service_file, callback)
 *  Where callback is a function, which is called
 *    whenever change is detected on service_file.
\*/

var _  = require('underscore')
var fs = require('fs')

module.exports.getServices = function getServices(file, changeCallback) {
    var list = []
    var opt = { encoding: 'utf8' }

    if (!fs.existsSync(file)) return null

    fs.watch(file).on('change', function() {
        if (_.isFunction(changeCallback)) {
            changeCallback()
        }
    })

    fs.readFileSync(file, opt).split('\n').forEach(function(line) {
        var name = ''
        var parts = line.split(/\s+/)

        if (line.indexOf('#') == 0) return
        if (parts.length <2) return

        name = (parts.length <3)? parts[0] + ':' + parts[1]: name = parts[2]

        list.push({
            addr: parts[0],
            port: parts[1],
            name: name
        })
    })

    return list
}
