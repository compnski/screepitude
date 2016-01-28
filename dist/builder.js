var Builder, Deliverator,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Deliverator = require('deliverator');

Builder = (function(superClass) {
  extend(Builder, superClass);

  function Builder(creep) {
    Builder.__super__.constructor.call(this, creep, this.primarySpawn, this.constructionSite);
  }

  Builder.prototype.constructionSite = function() {
    var sites;
    sites = this.creep.room.find(FIND_MY_CONSTRUCTION_SITES);
    sites.forEach((function(_this) {
      return function(s) {
        return s.distance = _this.creep.pos.getRangeTo(s);
      };
    })(this));
    sites.sort(function(a, b) {
      return a.distance - b.distance;
    });
    return sites[0];
  };

  return Builder;

})(Deliverator);

module.exports = Builder;

//# sourceMappingURL=builder.js.map
