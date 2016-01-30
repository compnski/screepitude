var Agent, Config, PathUtils;

PathUtils = require('path_utils');

Config = require('config');

Agent = (function() {
  function Agent(creep) {
    this.creep = creep;
  }

  Agent.prototype.setState = function(state) {
    return this.creep.memory.state = state;
  };

  Agent.prototype.loop = function() {
    var sources;
    if (!this.fullEnergy()) {
      sources = this.creep.room.find(FIND_SOURCES);
      return this.harvestFromSource(sources[0]);
    } else {
      return this.giveEnergyToSpawn(this.nearestEnergyNeed());
    }
  };

  Agent.prototype.harvestFromSource = function(source) {
    if (this.creep.harvest(source) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(source);
    }
  };

  Agent.prototype.primarySpawn = function() {
    return Game.spawns.Spawn1;
  };

  Agent.prototype.giveEnergyToSpawn = function(spawn) {
    if (this.creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(spawn);
    } else {
      if ((spawn.renewCreep != null) && Config.RewnewCreeps) {
        return spawn.renewCreep(this.creep);
      }
    }
  };

  Agent.prototype.fullEnergy = function() {
    return this.creep.carry.energy >= this.creep.carryCapacity;
  };

  Agent.prototype.needsEnergy = function() {
    return false;
  };

  Agent.prototype.hasEnergy = function() {
    return false;
  };

  return Agent;

})();

module.exports = Agent;

//# sourceMappingURL=agent.js.map
