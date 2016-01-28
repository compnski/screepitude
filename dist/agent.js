var Agent;

Agent = (function() {
  function Agent(creep) {
    this.creep = creep;
  }

  Agent.prototype.dumbHarvesting = function() {
    var sources;
    if (!this.fullEnergy()) {
      sources = this.creep.room.find(FIND_SOURCES);
      return this.harvestFromSource(sources[0]);
    } else {
      return this.giveEnergyToSpawn(this.primarySpawn());
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
      return spawn.renewCreep(this.creep);
    }
  };

  Agent.prototype.fullEnergy = function() {
    return this.creep.carry.energy >= this.creep.carryCapacity;
  };

  return Agent;

})();

module.exports = Agent;

//# sourceMappingURL=agent.js.map
