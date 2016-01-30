var Agent, HunterKiller, PathUtils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

PathUtils = require('path_utils');

HunterKiller = (function(superClass) {
  extend(HunterKiller, superClass);

  function HunterKiller() {
    return HunterKiller.__super__.constructor.apply(this, arguments);
  }

  HunterKiller.prototype.chooseTarget = function() {
    var targets;
    targets = new PathUtils(this.creep).sortByDistance(this.creep.room.find(FIND_HOSTILE_CREEPS).concat(this.creep.room.find(FIND_HOSTILE_SPAWNS)));
    return targets[0];
  };

  HunterKiller.prototype.loop = function(rally, target) {
    var err;
    rally || (rally = Game.flags.Flag1);
    target || (target = this.chooseTarget());
    if (target == null) {
      this.creep.moveTo(rally);
      return;
    }
    if ((err = this.creep.attack(target)) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target);
    }
  };

  return HunterKiller;

})(Agent);

module.exports = HunterKiller;

//# sourceMappingURL=hunter_killer.js.map
