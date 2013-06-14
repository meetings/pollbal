/* httpRequest.js
 */

var http = require('http')
var util = require('util')

var REQUEST_TIMEOUT = 333

exports.makeRequest = function init(options, callback, timeout) {
    if (typeof timeout === 'undefined') timeout = REQUEST_TIMEOUT

    var request = http.request(options, function(answer) {
        if (answer.statusCode != 200) {
            util.log("HTTP not OK, status code " + answer.statusCode)
            callback(null)
        }

        answer.on('data', function(data) {
            callback(data.toString())
        })
    })

    request.setTimeout(timeout, function() {
        util.log("Request timed out on service: " + options.port)
        callback(null)
    })

    request.on('error', function(e) {
        util.log("Unreachable service: " + options.port)
        callback(null)
    })

    request.end()
}
