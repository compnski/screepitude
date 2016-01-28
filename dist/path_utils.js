var PathUtils;

PathUtils = (function() {
  function PathUtils() {}

  PathUtils.sortByDistance = function(from, targets) {
    return targets.sort(this.distanceComparatorFactory(from.pos));
  };

  PathUtils.distance = function(a, b) {
    return a.getRangeTo(b);
  };

  PathUtils.distanceComparatorFactory = function(from) {
    return function(a, b) {
      if (a.distance == null) {
        a.distance = PathUtils.distance(from, a);
      }
      if (b.distance == null) {
        b.distance = PathUtils.distance(from, b);
      }
      return a.distance - b.distance;
    };
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
