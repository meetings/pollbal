/*\
 *  http.js, lightweight wrapper to request module
 *
 *  2013-09-28 / Meetin.gs
 *
 *  Usage: http.request(options, callback)
\*/

var Request = require('request')

exports.request = function request(options, callback) {
    Request(options, function(err, response, data) {
        if (!err && response.statusCode == 200) {
            callback(null, data)
        }
        else {
            callback(err, response)
        }
    })
}
