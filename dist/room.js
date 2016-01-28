var Room;

Room = (function() {
  function Room(room, targetCounts) {
    this.room = room;
    this.targetCounts = targetCounts;
  }

  Room.prototype.nameForRole = function(role) {
    var base, base1;
    (base = this.room.memory).totalCreepCounts || (base.totalCreepCounts = {});
    (base1 = this.room.memory.totalCreepCounts)[role] || (base1[role] = 0);
    this.room.memory.totalCreepCounts[role]++;
    return role + "_" + this.room.memory.totalCreepCounts[role];
  };

  Room.prototype.partsForRole = function(role) {
    switch (role) {
      case "harvester":
        return [WORK, CARRY, MOVE];
      case "upgrader":
        return [WORK, WORK, CARRY, MOVE];
      default:
        return [WORK, CARRY, MOVE];
    }
  };

  Room.prototype.memoryForRole = function(role) {
    return {
      "role": role
    };
  };

  Room.prototype.spawn = function(spawnFrom, role) {
    var memory, name, parts, ret;
    name = this.nameForRole(role);
    parts = this.partsForRole(role);
    memory = this.memoryForRole(role);
    ret = spawnFrom.createCreep(parts, name, memory);
    if (ret !== ERR_NOT_ENOUGH_RESOURCES) {
      return console.log("Spawning " + role + " named " + name + " from " + spawnFrom.name + " with " + parts + " and " + (JSON.stringify(memory)) + ", got " + ret);
    }
  };

  Room.prototype.loop = function() {
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

  return Room;

})();

module.exports = Room;

//# sourceMappingURL=room.js.map
