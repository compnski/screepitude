var Cell, MegaMiner;

MegaMiner = require('mega_miner');

Cell = (function() {
  function Cell(room, targetCounts1) {
    this.room = room;
    this.targetCounts = targetCounts1;
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
      var j, len, ref, results;
      ref = this.room.find(FIND_MY_STRUCTURES);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        s = ref[j];
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
      var j, len, ref, results;
      ref = this.room.find(FIND_MY_STRUCTURES);
      results = [];
      for (j = 0, len = ref.length; j < len; j++) {
        s = ref[j];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energy);
        }
      }
      return results;
    }).call(this)).sum();
  };

  Cell.prototype.partsForRole = function(role) {
    switch (role) {
      case "source1":
      case "source2":
        return this.makeRole({
          work: 2,
          carry: 1,
          move: 2
        });
      case "upgrader":
        return this.makeRole({
          work: 7,
          carry: 2,
          move: 2
        });
      case "transporter":
        return this.makeRole({
          carry: 6,
          move: 3
        });
      case "room2_transporter":
        return this.makeRole({
          carry: 9,
          move: 3
        });
      case "guard":
        return this.makeRole({
          tough: 3,
          move: 2,
          attack: 3
        });
      case "hunter_killer":
      case "hunter_killer_2":
        return this.makeRole({
          tough: 2,
          attack: 3,
          move: 4
        });
      case "healbot":
      case "healbot_2":
        return this.makeRole({
          tough: 2,
          heal: 1,
          move: 3
        });
      case "builder":
      case "repair":
        return this.makeRole({
          work: 6,
          carry: 4,
          move: 5
        });
      case "far_builder":
        return this.makeRole({
          work: 4,
          carry: 6,
          move: 5
        });
      case "mega_miner":
      case "mega_miner2":
        return MegaMiner.bodyParts(this);
      case "room2_mega_miner":
      case "room2_mega_miner2":
        return MegaMiner.bodyParts(this).concat([MOVE]);
      case 'upgrader_filler':
        return this.makeRole({
          carry: 6,
          move: 3
        });
      default:
        if (role.startsWith("position_miner")) {
          if (role.indexOf("transport") === -1) {
            return MegaMiner.bodyParts(this).concat([MOVE]);
          } else {
            return this.makeRole({
              carry: 12,
              move: 6
            });
          }
        } else {
          return [WORK, CARRY, MOVE];
        }
    }
  };

  Cell.prototype.makeRole = function(partsMap) {
    var count, i, j, part, parts, ref;
    parts = [];
    for (part in partsMap) {
      count = partsMap[part];
      for (i = j = 0, ref = count; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        parts.push(part);
      }
    }
    return parts;
  };

  Cell.prototype.memoryForRole = function(role) {
    return {
      "role": role
    };
  };

  Cell.prototype.partsCost = function(parts) {
    return parts.map(function(s) {
      switch (s) {
        case TOUGH:
          return 10;
        case MOVE:
        case CARRY:
          return 50;
        case ATTACK:
          return 80;
        case WORK:
          return 100;
        case RANGED_ATTACK:
          return 150;
        case HEAL:
          return 250;
      }
    }).sum();
  };

  Cell.prototype.spawn = function(spawnFrom, role) {
    var memory, name, parts, partsCost, ret;
    name = this.nameForRole(role);
    parts = this.partsForRole(role);
    memory = this.memoryForRole(role);
    partsCost = this.partsCost(parts);
    if (partsCost > this.spawnEnergyCapacity()) {
      console.log("Can't spawn " + role + " due to max capacity -- have " + (this.spawnEnergyCapacity()) + "/" + partsCost);
      return false;
    }
    ret = spawnFrom.createCreep(parts, name, memory);
    if (ret === ERR_NOT_ENOUGH_RESOURCES) {
      console.log("Can't spawn " + role + " due to resources -- have " + (this.spawnEnergy()) + "/" + partsCost);
      this.spawnFailed = true;
      return true;
    } else if (ret < 0) {
      console.log("Can't spawn " + role + " due to other error: " + err + " -- have " + (this.spawnEnergy()) + "/" + partsCost);
      return false;
    } else {
      console.log("Spawning " + role + " named " + name + " from " + spawnFrom.name + " with " + parts + " and " + (JSON.stringify(memory)) + ", got " + ret);
    }
    return true;
  };

  Cell.prototype.loop = function() {
    var _, creep, creepCount, name1, numCreeps, ref, ref1, results, role, spawn, targetCount;
    spawn = Game.spawns.Spawn1;
    if (Game.cpu.bucket < 2000) {
      return;
    }
    if (spawn.spawning) {
      return;
    }
    creepCount = {};
    numCreeps = 0;
    ref = Game.creeps;
    for (_ in ref) {
      creep = ref[_];
      if (creep.ticksToLive < 100) {
        continue;
      }
      creepCount[name1 = creep.memory.role] || (creepCount[name1] = 0);
      creepCount[creep.memory.role]++;
      numCreeps++;
    }
    if (numCreeps < 5) {
      Game.notify("EMERGENCY: CreepCount low: " + (JSON.stringify(creepCount)));
      targetCounts['source1'] = 2;
      targetCounts['source2'] = 2;
    }
    console.log("\n");
    console.log(JSON.stringify(creepCount));
    if (!spawn.spawning) {
      ref1 = this.targetCounts;
      results = [];
      for (role in ref1) {
        targetCount = ref1[role];
        if ((creepCount[role] || 0) < targetCount) {
          if (this.spawn(spawn, role)) {
            break;
          } else {
            results.push(void 0);
          }
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
