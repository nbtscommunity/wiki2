var repo = require('git-node').repo('pages.git');
var util = require('util');
var url = require('url');
var pathWalk = require('./pathwalk');
var markdown = require( "markdown" ).markdown;

require('http').createServer(function (req, res) {
    var u = url.parse(req.url);

    if (req.cgiHeaders && req.cgiHeaders.SCRIPT_NAME) u.pathname = u.path = u.href = u.href.replace(new RegExp('^' + req.cgiHeaders.SCRIPT_NAME + '/'), '');

    var last, lastHash;

    repo.load('HEAD', function (err, head) {
        if (err) return grump(err);
        pathWalk.call(repo, head.body.tree, u.pathname)(function (err, obj, done) {
            if (err) return grump(err);

            if (obj.type == 'blob') {
                if (req.method == 'GET') {
                    res.setHeader('Content-Type', 'text/html');
                    res.end(markdown.toHTML(obj.body.toString()));
                } else {
                    req.pipe(concat(function (data) {
                        repo.saveAs('blob', data)(function (err, hash) {
                            if (err) return grump(err);
                            lastHash = hash;
                            done();
                        });
                    }));
                }
            } else if (obj.type == 'tree') {
                var done = false;
                console.log('last', last, 'lastHash', lastHash);
                for (var i in obj.body) {
                    if (obj.body[i].name == last) {
                        obj.body[i].hash = lastHash;
                        done = true;
                    }
                }
                if (!done) {
                    obj.body.push({
                        name: last,
                        mode: 33188,
                        hash: lastHash
                    });
                }

                repo.saveAs('tree', obj)(function (err, hash) {
                    if (err) return grump(err);
                    lastHash = hash;
                    done();
                });
            } else {
                res.end();
                done();
            }
        });

    });

    function grump(err) {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 500;
        res.end(err instanceof Error ? err.stack : util.inspect(err));
    }
}).listen('passenger');
