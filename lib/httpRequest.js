/* httpRequest.js
 */

var http = require('http')
var util = require('util')

var error = function error(str, obj) {
    util.log(str)
    util.error(util.inspect(obj, {depth: null}))
}

exports.makeRequest = function init(options, callback) {
    var request = http.request(options, function(answer) {
        if (answer.statusCode != 200) {
            error("HTTP " + statusCode, options)
        }

        answer.on('data', function(data) {
            callback(options, data.toString())
        })
    })

    request.setTimeout(500, function() {
        error("Request timed out", options)
    })

    request.on('error', function(e) {
        error("HTTP request error: " + e.code, options)
    })

    request.end()
}
