var repo = require('git-node').repo('pages.git');
var util = require('util');

require('http').createServer(function (req,res) {
    req.resume(); // Passenger
    pathWalk.call(repo, 'HEAD', '')(function (err, blob) {
        if (err) return res.end(err);
        res.end(util.inspect(blob));
    });
}).listen('passenger');

function pathWalk(hashish, path, cb) {
    if (!cb) return pathWalk.bind(this, hashish, path);

    var paths = path.split('/');

    this.load(hashish)(inner.bind(this, paths));

    function inner(paths, err, obj) {
        if (err) return cb(err);

        if (obj.type == 'commit') return this.load(obj.body.tree)(inner.bind(this, paths));

        if (obj.type == 'tree') {
            if (!paths[0]) return cb(null, obj);
            var ent;
            if (ent = obj.body.reduce(function (_, e) { return _ ? _ : e.name == paths[0] ? e.hash : null; })) {
                console.log('hash', ent.hash);
                return this.load(ent.hash)(inner.bind(this, paths.slice(1)));
            } else {
                return cb("ENOENT");
            }
        } else {
            if (!paths[0]) return cb(null, obj);
            return cb("ENOENT");
        }
    }
}
