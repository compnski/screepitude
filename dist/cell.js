var Cell, MegaMiner;

MegaMiner = require('mega_miner');

Cell = (function() {
  function Cell(room, targetCounts) {
    this.room = room;
    this.targetCounts = targetCounts;
  }

  Cell.prototype.nameForRole = function(role) {
    var base, base1;
    (base = this.room.memory).totalCreepCounts || (base.totalCreepCounts = {});
    (base1 = this.room.memory.totalCreepCounts)[role] || (base1[role] = 0);
    this.room.memory.totalCreepCounts[role]++;
    return role + "_" + this.room.memory.totalCreepCounts[role];
  };

  Cell.prototype.spawnEnergyCapacity = function() {
    var s;
    return ((function() {
      var i, len, ref, results;
      ref = this.room.find(FIND_MY_STRUCTURES);
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        s = ref[i];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energyCapacity);
        }
      }
      return results;
    }).call(this)).sum();
  };

  Cell.prototype.spawnEnergy = function() {
    var s;
    return ((function() {
      var i, len, ref, results;
      ref = this.room.find(FIND_MY_STRUCTURES);
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        s = ref[i];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energy);
        }
      }
      return results;
    }).call(this)).sum();
  };

  Cell.prototype.partsForRole = function(role) {
    switch (role) {
      case "harvester":
        return [WORK, CARRY, MOVE];
      case "upgrader":
        return [WORK, WORK, WORK, CARRY, MOVE];
      case "transporter":
        return [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];
      case "guard":
        return [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK];
      case "repair":
        return [WORK, WORK, CARRY, MOVE, MOVE];
      case "builder":
        return [WORK, WORK, WORK, CARRY, CARRY, MOVE];
      case "mega_miner":
      case "mega_miner2":
        return MegaMiner.bodyParts(this);
      default:
        return [WORK, CARRY, MOVE];
    }
  };

  Cell.prototype.memoryForRole = function(role) {
    return {
      "role": role
    };
  };

  Cell.prototype.spawn = function(spawnFrom, role) {
    var memory, name, parts, ret;
    name = this.nameForRole(role);
    parts = this.partsForRole(role);
    memory = this.memoryForRole(role);
    ret = spawnFrom.createCreep(parts, name, memory);
    if (ret === ERR_NOT_ENOUGH_RESOURCES) {
      console.log("Can't spawn " + role + " due to resources -- have " + (this.spawnEnergy()) + "/" + (this.spawnEnergyCapacity()));
      return this.spawnFailed = true;
    } else {
      return console.log("Spawning " + role + " named " + name + " from " + spawnFrom.name + " with " + parts + " and " + (JSON.stringify(memory)) + ", got " + ret);
    }
  };

  Cell.prototype.loop = function() {
    var creep, creepCount, i, len, name1, ref, ref1, results, role, spawn, targetCount;
    creepCount = {};
    ref = this.room.find(FIND_MY_CREEPS);
    for (i = 0, len = ref.length; i < len; i++) {
      creep = ref[i];
      creepCount[name1 = creep.memory.role] || (creepCount[name1] = 0);
      creepCount[creep.memory.role]++;
    }
    spawn = this.room.find(FIND_MY_SPAWNS)[0];
    if (!spawn.spawning) {
      ref1 = this.targetCounts;
      results = [];
      for (role in ref1) {
        targetCount = ref1[role];
        if ((creepCount[role] || 0) < targetCount) {
          this.spawn(spawn, role);
          break;
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  return Cell;

})();

module.exports = Cell;

//# sourceMappingURL=cell.js.map
