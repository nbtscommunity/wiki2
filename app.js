var platform = require('git-node-platform');
var fsDb = require('git-fs-db')(platform);
var jsGit = require('js-git');

var repo = jsGit(fsDb(platform.fs('pages.git')));

var util = require('util');
var url = require('url');
var marked = require("marked");
var concat = require('concat-stream');
var wrap = require('js-git-as-fs');
var http = require('http');
var tee = require('pull-tee');
var stream = require('stream');

wrap(repo, 'master', function (err, fs) {
    if (err) throw err;

    http.createServer(function (req, res) {
        var u = url.parse(req.url);

        if (req.cgiHeaders && req.cgiHeaders.SCRIPT_NAME) u.pathname = u.path = u.href = u.href.replace(new RegExp('^' + req.cgiHeaders.SCRIPT_NAME), '');

        if (req.method.toUpperCase() == 'GET') {
            get();
        } else {
            req.pipe(concat(function (data) {
                fs.createWriteStream(u.pathname).on('end', function () {
                    fs.commit('BOOM', function (err) {
                        if (err) return grump(err);
                        get();
                    });
                }).on('error', grump).end(data);
            })).on('error', grump);
        }

        function grump(err) {
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 500;
            res.end(err instanceof Error ? err.stack : util.inspect(err));
        }

        function get(pathname) {
            var p = new stream.PassThrough();
            res.setHeader('Content-Type', 'text/html');
            fs.createReadStream(u.pathname).on('error', grump).pipe(concat(function (data) {
                p.end(marked(data.toString()));
            })).on('error', grump);

            p.pipe(res).on('error', grump);
            return p;
        }
    }).listen(5000);
});
