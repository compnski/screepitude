var PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PathUtils = (function() {
  function PathUtils(pos) {
    this.pos = pos;
    this.distanceComparator = bind(this.distanceComparator, this);
    if (this.pos.pos != null) {
      this.pos = this.pos.pos;
    }
  }

  PathUtils.prototype.sortByDistance = function(targets) {
    return targets.sort(this.distanceComparator);
  };

  PathUtils.prototype.distance = function(target) {
    return this.pos.getRangeTo(target);
  };

  PathUtils.prototype.distanceComparator = function(a, b) {
    if (a.distance == null) {
      a.distance = this.distance(a);
    }
    if (b.distance == null) {
      b.distance = this.distance(b);
    }
    return a.distance - b.distance;
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
