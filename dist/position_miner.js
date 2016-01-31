var Agent, PathUtils, PositionMiner,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

PathUtils = require('path_utils');

Agent = require('agent');

PositionMiner = (function(superClass) {
  extend(PositionMiner, superClass);

  function PositionMiner(creep, miningPos) {
    this.miningPos = miningPos;
    PositionMiner.__super__.constructor.call(this, creep);
    creep.memory.energyProvider = true;
  }

  PositionMiner.prototype.loop = function() {
    var source, sources;
    if (this.fullEnergy()) {
      return;
    }
    if (!this.creep.pos.inRangeTo(this.miningPos, 2)) {
      this.log("Not in range " + (JSON.stringify(this.miningPos)));
      return this.creep.moveTo(this.miningPos);
    } else {
      sources = new PathUtils(this.creep).sortByDistance(this.creep.room.find(FIND_SOURCES));
      this.log(sources.map((function(s) {
        return s.pos;
      })));
      source = sources[0];
      if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
        this.log("Not in range to harvest " + (JSON.stringify(source.pos)));
        return this.creep.moveTo(source);
      }
    }
  };

  return PositionMiner;

})(Agent);

module.exports = PositionMiner;

//# sourceMappingURL=position_miner.js.map
