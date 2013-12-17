var pathWalk = require('./pathwalk');
var stream = require('stream');
var concat = require('concat-stream');

module.exports = function wrap(repo, ref, cb) {
    repo.load(ref, function (err, head) {
        if (err) return cb(err);
        var root = head.body.tree;
        cb(null, {
            createReadStream: function (path) {
                var s = new stream.PassThrough();

                pathWalk.call(repo, root, path, function (err, obj, finish) {
                    if (err) return s.emit('error', err);
                    if (obj.type == 'blob') {
                        s.end(obj.body);
                        finish();
                    } else {
                        s.emit('error', 'EISDIR');
                    }
                }, function (err, hash) {
                    if (err) return s.emit('error', err);
                });

                return s;
            },

            createWriteStream: function (path) {
                var s = new stream.PassThrough();

                s.pipe(concat(function (data) {
                    pathWalk.call(repo, root, path, function (err, obj, finish) {
                        if (err) return s.emit('error', err);
                        if (obj.type == 'blob') {
                            repo.saveAs('blob', data, function (err, hash) {
                                if (err) return s.emit('error', err);
                                finish(null, data);
                            });
                        } else {
                            s.emit('error', 'EISDIR');
                        }
                    }, function (err, hash) {
                        if (err) return s.emit('error', err);
                        root = hash;
                    });
                }));

                return s;
            },

            commit: function (message) {
                console.log('commit with hash', root);
            }
        });
    });
};
