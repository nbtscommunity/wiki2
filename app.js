var repo = require('git-node').repo('pages.git');
var util = require('util');
var url = require('url');
var pathWalk = require('./pathwalk');
var markdown = require( "markdown" ).markdown;

require('http').createServer(function (req, res) {
    var u = url.parse(req.url);

    if (req.cgiHeaders) req.resume(); // Passenger is streams1. Kind-of.

    if (req.method == 'GET') {
        if (req.cgiHeaders && req.cgiHeaders.SCRIPT_NAME) u.pathname = u.path = u.href = u.href.replace(new RegExp('^' + req.cgiHeaders.SCRIPT_NAME + '/'), '');

        pathWalk.call(repo, 'HEAD', u.pathname)(function (err, blob) {
            if (err) return res.end(err);
            if (blob.type != 'blob') {
                res.end(util.inspect(blob));
            } else {
                res.setHeader('content-type', 'text/html');
                res.end(markdown.toHTML(blob.body.toString()));
            }
        });
    } else {
        res.end('method not supported');
    }
}).listen('passenger');
