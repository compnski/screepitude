var Builder, Deliverator, PathUtils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

PathUtils = require('path_utils');

Deliverator = require('deliverator');

Builder = (function(superClass) {
  extend(Builder, superClass);

  function Builder(creep) {
    Builder.__super__.constructor.call(this, creep, this.primarySpawn, this.constructionSite);
  }

  Builder.prototype.constructionSite = function() {
    var sites;
    sites = new PathUtils(this.creep).sortByDistance(this.creep.room.find(FIND_MY_CONSTRUCTION_SITES));
    return sites[0];
  };

  return Builder;

})(Deliverator);

module.exports = Builder;

//# sourceMappingURL=builder.js.map
