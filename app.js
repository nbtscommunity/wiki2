var platform = require('git-node-platform');
var fsDb = require('git-fs-db')(platform);
var jsGit = require('js-git');

var repo = jsGit(fsDb(platform.fs('pages.git')));

var util = require('util');
var url = require('url');
var markdown = require( "markdown" ).markdown;
var concat = require('concat-stream');
var wrap = require('./wrap');
var http = require('http');
var tee = require('pull-tee');

wrap(repo, 'master', function (err, fs) {
    if (err) throw err;

    http.createServer(function (req, res) {
        var u = url.parse(req.url);

        if (req.cgiHeaders && req.cgiHeaders.SCRIPT_NAME) u.pathname = u.path = u.href = u.href.replace(new RegExp('^' + req.cgiHeaders.SCRIPT_NAME), '');

        if (req.method.toUpperCase() == 'GET') {
            fs.createReadStream(u.pathname).pipe(concat(function (data) {
                res.setHeader('Content-Type', 'text/html');
                res.end(markdown.toHTML(data.toString()) + '\n');
            })).on('error', grump);
        } else {
            req.pipe(concat(function (data) {
                res.setHeader('Content-Type', 'text/html');
                res.end(markdown.toHTML(data.toString()) + '\n');
                fs.createWriteStream(u.pathname).on('end', function () {
                    fs.commit('BOOM');
                }).end(data);
            })).on('error', grump);
        }
    }).listen(5000);

    function grump(err) {
        res.setHeader('Content-Type', 'text/plain');
        res.statusCode = 500;
        res.end(err instanceof Error ? err.stack : util.inspect(err));
    }
});

