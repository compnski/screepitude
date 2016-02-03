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

  HunterKiller.prototype.chooseTarget = function(rally) {
    var target, targets;
    targets = [];
    targets = new PathUtils(rally).sortByDistance(this.creep.room.find(FIND_HOSTILE_CREEPS).concat(this.creep.room.find(FIND_HOSTILE_SPAWNS)));
    target = targets[0];
    console.log(target);
    if (target == null) {
      return;
    }
    console.log(this.creep.name + " closing in on " + (target.name || target.structureType) + ": " + (this.creep.pos.getRangeTo(target)) + " units");
    return target;
  };

  HunterKiller.prototype.loop = function(rally, target) {
    var err;
    rally || (rally = Game.flags.Flag1);
    target || (target = this.chooseTarget(rally));
    if ((target != null) && rally.pos.getRangeTo(target) > 15) {
      target = null;
    }
    if ((target == null) && !this.creep.pos.inRangeTo(rally, 3)) {
      this.creep.moveTo(rally, {
        ignoreDestructible: true
      });
      return;
    }
    if ((err = this.creep.attack(target)) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target, {
        ignoreDestructible: true
      });
    }
  };

  return HunterKiller;

})(Agent);

module.exports = HunterKiller;

//# sourceMappingURL=hunter_killer.js.map
