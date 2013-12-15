module.exports = function pathWalk(hash, path, cb, up) {
    if (!cb) return pathWalk.bind(this, hash, path);

    if (typeof path == 'string') {
        path = path.split('/');
        path.shift();
    }

    var self = this;

    this.load(hash, function (err, obj) {
        var ent;
        if (err) return cb(err);

        if (!path[0]) return cb(null, obj, finish);

        if (obj.type == 'tree') {
            if (ent = find(obj.body, function (e) { return e.name == path[0]; })) {
                return pathWalk.call(self, ent.hash, path.slice(1), cb, finish);
            } else {
                return cb("ENOENT");
            }
        } else {
            if (!path[0]) {
                var result = cb(null, obj, next);
                if (typeof result == 'undefined') {
                }
            } else {
                return cb("ENOENT");
            }
        }

        function finish (replacement) {
            console.log(arguments, obj, hash);
            if (up) up(obj);
        }
    });
};

function find(arr, cb) {
    for (var i in arr) {
        if (cb(arr[i])) return arr[i];
    }
}
