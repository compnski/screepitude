var Builder, Config, Deliverator, PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

PathUtils = require('path_utils');

Deliverator = require('deliverator');

Config = require('config');

Builder = (function(superClass) {
  extend(Builder, superClass);

  function Builder(creep, sourceFn) {
    var target;
    if (sourceFn == null) {
      sourceFn = null;
    }
    this.constructionSite = bind(this.constructionSite, this);
    if (Game.flags.BuildHere != null) {
      target = Game.flags.BuildHere;
    } else {
      target = creep;
    }
    if (sourceFn == null) {
      this.pathUtils || (this.pathUtils = new PathUtils(target));
      sourceFn = this.pathUtils.nearestEnergyProvider;
    }
    Builder.__super__.constructor.call(this, creep, sourceFn, this.constructionSite);
    creep.memory.energyRequester = true;
  }

  Builder.prototype.ramparts = function(s) {
    return (s.structureType === 'rampart') && (s.hits < Math.min(Config.MaxWallHP, s.hitsMax));
  };

  Builder.prototype.walls = function(s) {
    return s.structureType === 'constructedWall' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP || 3000000);
  };

  Builder.prototype.constructionSite = function() {
    var sites;
    this.pathUtils || (this.pathUtils = new PathUtils(target));
    sites = this.pathUtils.sortByDistance(this.creep.room.find(FIND_MY_CONSTRUCTION_SITES));
    if (sites.length === 0) {
      sites = this.pathUtils.sortByDistance(this.creep.room.find(FIND_MY_STRUCTURES).filter(this.ramparts));
    }
    return sites[0];
  };

  return Builder;

})(Deliverator);

module.exports = Builder;

//# sourceMappingURL=builder.js.map
