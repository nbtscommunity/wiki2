module.exports = function pathWalk(hashish, path, cb) {
    if (!cb) return pathWalk.bind(this, hashish, path);

    var paths = path.split('/');

    this.load(hashish)(inner.bind(this, paths));

    function inner(paths, err, obj) {
        var ent;
        if (err) return cb(err);

        if (obj.type == 'commit') return this.load(obj.body.tree)(inner.bind(this, paths));

        if (obj.type == 'tree') {
            if (!paths[0]) return cb(null, obj);
            if (ent = find(obj.body, function (e) { return e.name == paths[0]; })) {
                return this.load(ent.hash)(inner.bind(this, paths.slice(1)));
            } else {
                return cb("ENOENT");
            }
        } else {
            if (!paths[0]) return cb(null, obj);
            return cb("ENOENT");
        }
    }
};

function find(arr, cb) {
    for (var i in arr) {
        if (cb(arr[i])) return arr[i];
    }
}
