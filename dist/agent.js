var Agent, PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PathUtils = require('path_utils');

Agent = (function() {
  function Agent(creep) {
    this.primarySpawn = bind(this.primarySpawn, this);
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

  Agent.prototype.nearestEnergyNeed = function() {
    var targets;
    targets = this.creep.room.find(FIND_MY_STRUCTURES).filter(function(c) {
      return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
    });
    new PathUtils(this.creep).sortByDistance(targets);
    if (targets.length !== 0) {
      return targets[0];
    }
    return this.primarySpawn();
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
      if (spawn.renewCreep != null) {
        return spawn.renewCreep(this.creep);
      }
    }
  };

  Agent.prototype.fullEnergy = function() {
    return this.creep.carry.energy >= this.creep.carryCapacity;
  };

  return Agent;

})();

module.exports = Agent;

//# sourceMappingURL=agent.js.map
