/* httpRequest.js
 */

var http = require('http')
var util = require('util')

exports.makeRequest = function init(options, callback) {
    var request = http.request(options, function(answer) {
        if (answer.statusCode != 200) {
            util.log("HTTP not OK, status code " + answer.statusCode)
        }

        answer.on('data', function(data) {
            callback(options, data.toString())
        })
    })

    request.setTimeout(500, function() {
        util.log("Request timed out on service: " + options.port)
    })

    request.on('error', function(e) {
        util.log("Unreachable service: " + options.port)
    })

    request.end()
}
