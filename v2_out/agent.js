var Agent, Config;

Config = require('config');

Agent = (function() {
  function Agent(creep) {
    this.creep = creep;
  }

  Agent.prototype.setState = function(state) {
    return this.creep.memory.state = state;
  };

  Agent.prototype.moveTo = function(targetPos, opts) {
    if (opts == null) {
      opts = {};
    }
    if (targetPos.pos != null) {
      targetPos = targetPos.pos;
    }
    opts.maxOps || (opts.maxOps = 1000);
    if (targetPos.roomName !== this.creep.pos.roomName) {
      opts.reusePath || (opts.reusePath = 10);
      return this.creep.moveTo(targetPos, opts);
    } else {
      opts.reusePath || (opts.reusePath = 20);
      return this.creep.moveTo(targetPos, opts);
    }
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

  Agent.prototype.log = function(msg) {
    return console.log("[" + this.creep.name + "] " + msg);
  };

  return Agent;

})();

module.exports = Agent;

//# sourceMappingURL=agent.js.map
