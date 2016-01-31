var Agent, Guard, PathUtils,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

PathUtils = require('path_utils');

Guard = (function(superClass) {
  extend(Guard, superClass);

  function Guard() {
    return Guard.__super__.constructor.apply(this, arguments);
  }

  Guard.prototype.chooseTarget = function() {
    var targets;
    targets = new PathUtils(this.creep).sortByDistance(this.creep.room.find(FIND_HOSTILE_CREEPS));
    return targets[0];
  };

  Guard.prototype.loop = function() {
    var err, rally, target;
    target = this.chooseTarget();
    if ((target != null) && this.creep.pos.getRangeTo(target) > 5) {
      target = null;
    }
    rally = Game.flags.Flag1;
    if ((target == null) && !this.creep.pos.inRangeTo(rally, 2)) {
      this.creep.moveTo(rally);
      return;
    }
    if ((err = this.creep.attack(target)) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target);
    }
  };

  return Guard;

})(Agent);

module.exports = Guard;

//# sourceMappingURL=guard.js.map
