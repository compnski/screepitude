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
    var err, source;
    if (this.fullEnergy()) {
      return;
    }
    if (!this.creep.memory.sourceId) {
      if (this.miningPos.roomName === this.creep.pos.roomName) {
        this.creep.memory.sourceId = new PathUtils(this.miningPos).sortByDistance(this.creep.room.find(FIND_SOURCES))[0].id;
        this.log("Found source " + this.creep.memory.sourceId);
      } else {
        this.log("Moving toward " + this.miningPos);
        this.creep.moveTo(this.miningPos, {
          reusePath: 50
        });
        return;
      }
    }
    if (this.creep.memory.sourceId) {
      source = Game.getObjectById(this.creep.memory.sourceId);
      if ((err = this.creep.harvest(source) === ERR_NOT_IN_RANGE)) {
        this.creep.moveTo(source, {
          reusePath: 10
        });
      }
      if (err === -7) {
        delete this.creep.memory.sourceId;
        return this.log('Deleting sourceId!!');
      }
    }
  };

  return PositionMiner;

})(Agent);

module.exports = PositionMiner;

//# sourceMappingURL=position_miner.js.map
