var Agent, Healbot, PathUtils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

PathUtils = require('path_utils');

Healbot = (function(superClass) {
  extend(Healbot, superClass);

  function Healbot() {
    return Healbot.__super__.constructor.apply(this, arguments);
  }

  Healbot.prototype.chooseTarget = function() {
    var targets;
    targets = new PathUtils(this.creep).sortByDistance(this.creep.room.find(FIND_MY_CREEPS).filter(function(c) {
      return c.hits < c.hitsMax;
    }));
    return targets[0];
  };

  Healbot.prototype.loop = function(rally) {
    var err, target;
    target = this.chooseTarget();
    rally || (rally = Game.flags.Flag1);
    if ((target == null) && !this.creep.pos.inRangeTo(rally, 3)) {
      this.creep.moveTo(rally);
      return;
    }
    if ((err = this.creep.heal(target)) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target);
    }
  };

  return Healbot;

})(Agent);

module.exports = Healbot;

//# sourceMappingURL=healbot.js.map
