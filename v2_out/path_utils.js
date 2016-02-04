var PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PathUtils = (function() {
  function PathUtils(pos) {
    this.pos = pos;
    this.distanceComparator = bind(this.distanceComparator, this);
    if (this.pos.pos) {
      this.pos = this.pos.pos;
    }
    this.pos_S = this.pos.roomName + "_" + this.pos.x + "_" + this.pos.y;
  }

  PathUtils.prototype.sortByDistance = function(targets) {
    var t;
    t = targets.sort(this.distanceComparator);
    return t;
  };

  PathUtils.prototype.distance = function(target) {
    return this.pos.getRangeTo(target);
  };

  PathUtils.prototype.distanceComparator = function(a, b) {
    var base, base1, name, name1;
    if (a.distances == null) {
      a.distances = {};
    }
    if ((base = a.distances)[name = this.pos_S] == null) {
      base[name] = this.distance(a);
    }
    if (b.distances == null) {
      b.distances = {};
    }
    if ((base1 = b.distances)[name1 = this.pos_S] == null) {
      base1[name1] = this.distance(b);
    }
    return a.distances[this.pos_S] - b.distances[this.pos_S];
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
