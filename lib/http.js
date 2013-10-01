/*\
 *  http.js, lightweight wrapper to request module
 *
 *  2013-10-02 / Meetin.gs
 *
 *  Usage: http.request(options, callback)
\*/

var request = require('request')

module.exports.request = function(options, callback) {
    request(options, function(err, response, data) {
        if (!err && response.statusCode == 200) {
            callback(null, data)
        }
        else {
            callback(err, response)
        }
    })
}
