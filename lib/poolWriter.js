/* poolWriter.js
 */

var write = require('fs').writeFileSync

var basedir = '/run/pool'

exports.writePool = function writePool(config, stati) {
    for (var intent in stati) {
        var buffer   = ""
        var filename = basedir + '/' + intent + '.pool'

        for (var port in stati[intent]) {
            if (config[intent] !== undefined) {
                if (config[intent] === stati[intent][port]['hash']) {
                    buffer += 'localhost:' + port
                }
            }
        }

        if (buffer) {
            write(filename, buffer, {
                encoding: 'utf8',
                mode: 0644
            })
        }
    }
}
