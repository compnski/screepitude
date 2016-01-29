var Agent, MegaMiner,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

MegaMiner = (function(superClass) {
  extend(MegaMiner, superClass);

  MegaMiner.bodyParts = function(room) {
    var i, spawnSpace, workParts;
    spawnSpace = room.spawnEnergyCapacity();
    workParts = Math.min(Math.floor((spawnSpace - 100) / 100), 5);
    return [MOVE, CARRY].concat((function() {
      var j, ref, results;
      results = [];
      for (i = j = 1, ref = workParts; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
        results.push(WORK);
      }
      return results;
    })());
  };

  function MegaMiner(creep, targetSource) {
    if (targetSource == null) {
      targetSource = nil;
    }
    MegaMiner.__super__.constructor.call(this, creep);
    creep.memory.energyProvider = true;
    if (targetSource != null) {
      this.targetSource = creep.memory.targetSource = targetSource;
    }
  }

  MegaMiner.prototype.loop = function() {
    if (this.creep.pos === this.creep.pos.findClosestByRange(FIND_DROPPED_ENERGY).pos) {
      this.creep.pickup(this.creep.pos.findClosestByRange(FIND_DROPPED_ENERGY));
      return;
    }
    switch (this.creep.harvest(this.targetSource)) {
      case ERR_NOT_IN_RANGE:
        this.creep.moveTo(this.targetSource);
        break;
      case ERR_NOT_ENOUGH_RESOURCES:
        this.creep.pickup(this.creep.pos.findClosestByRange(FIND_DROPPED_ENERGY));
    }
    if (this.creep.carry.energy >= this.creep.energyCapacity) {
      return this.creep.say("I'm Full!");
    }
  };

  MegaMiner.prototype.hasEnergy = function() {
    return this.creep.carry.energy > 0;
  };

  return MegaMiner;

})(Agent);

module.exports = MegaMiner;

//# sourceMappingURL=mega_miner.js.map
