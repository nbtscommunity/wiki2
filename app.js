var repo = require('git-node').repo('pages.git');
var util = require('util');
var pathWalk = require('./pathwalk');

require('http').createServer(function (req, res) {
    req.resume(); // Passenger
    pathWalk.call(repo, 'HEAD', '')(function (err, blob) {
        if (err) return res.end(err);
        res.end(util.inspect(blob));
    });
}).listen('passenger');
