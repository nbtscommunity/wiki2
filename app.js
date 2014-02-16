#!/usr/bin/env node
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
var duplexer = require('duplexer');
var accepts = require('accepts');
var hyperstream = require('hyperstream');

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
            var type = accepts(req).types('text/html', 'text/markdown');
            if (type == 'text/markdown') {
                res.setHeader('Content-Type', type);
                return fs.createReadStream(u.pathname).on('error', function (err) {
                    if (err.code == 'ENOENT') {
                        res.statusCode = 404;
                        p.end('');
                    } else {
                        res.statusCode = 500;
                        p.end(JSON.stringify(err));
                    }
                }).pipe(p);
            } else {
                res.setHeader('Content-Type', 'text/html');
                var h = hyperstream({
                    '#body': fallbackStream(fs.createReadStream(u.pathname), write("Page not found")).on('fallback', function () {
                        res.statusCode = 404;
                    }).pipe(markedStream())
                });

                h.pipe(p);

                fallbackStream(fs.createReadStream('/layout.html'), write('<div id="body"></div>')).pipe(h);
            }
            p.pipe(res).on('error', grump);
            return p;
        }
    }).listen(5000);
});

function markedStream() {
    var p = new stream.PassThrough();

    return duplexer(concat(function (data) {
        p.end(marked(data.toString()));
    }), p);
}

function fallbackStream(main, fallback) {
    var p = new stream.PassThrough();
    main.on('open', function () {
        main.pipe(p);
    }).on('error', function () {
        p.emit('fallback');
        fallback.pipe(p);
    });
    return p;
}

function write(str) {
    var p = new stream.PassThrough();
    p.end(str);
    return p;
}
