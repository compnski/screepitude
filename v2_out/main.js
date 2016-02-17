var Config, Creeps, PathUtils, Role, Roles, TaskCounts, Tasks, Utils, Waypointer, cpuOverBudget, creep, e, j, len, name, name1, primaryRoom, primarySpawn, primaryStorage, primaryTower, r, realStart, ref, ref1, ref10, ref11, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, resolveArgs, room1Pos, room2, room2Pos, room3, room3Pos, room4, room4Pos, room5, room5Pos, room6, room6Pos, roomNameToPos, serializeArg, shuffle, t,
  slice = [].slice;

realStart = Game.cpu.getUsed();

cpuOverBudget = function() {
  return (Game.cpu.bucket < 5000 && Game.cpu.getUsed() > 100) || (Game.cpu.bucket < 2000 && Game.cpu.getUsed() > 30) || (Game.cpu.bucket < 1000 && Game.cpu.getUsed() > 10) || Game.cpu.bucket < 100;
};

shuffle = function(arr, required) {
  var i, index, j, randInt, ref, ref1, ref2;
  if (required == null) {
    required = arr.length;
  }
  randInt = function(n) {
    return Math.floor(n * Math.random());
  };
  if (required > arr.length) {
    required = arr.length;
  }
  if (required <= 1) {
    return arr[randInt(arr.length)];
  }
  for (i = j = ref = arr.length - 1, ref1 = arr.length - required; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
    index = randInt(i + 1);
    ref2 = [arr[i], arr[index]], arr[index] = ref2[0], arr[i] = ref2[1];
  }
  return arr.slice(arr.length - required);
};

Array.prototype.sum = function() {
  if (!this.length) {
    return 0;
  }
  return this.reduce(function(a, b) {
    return a + b;
  });
};

String.prototype.paddingLeft = function(paddingValue) {
  return String(paddingValue + this).slice(-paddingValue.length);
};

Creep.prototype.roleName = function() {
  var p;
  p = this.name.split("_");
  p.pop();
  return p.join("_");
};

Creep.prototype.canRepair = function() {
  return (this.body.filter(function(s) {
    return s.type === WORK && s.hits;
  })).length > 0;
};

Creep.prototype.canHeal = function() {
  return (this.body.filter(function(s) {
    return s.type === HEAL && s.hits;
  })).length > 0;
};

Creep.prototype.canAttack = function() {
  return (this.body.filter(function(s) {
    return s.type === ATTACK && s.hits;
  })).length > 0;
};

Creep.prototype.canShoot = function() {
  return (this.body.filter(function(s) {
    return s.type === RANGED_ATTACK && s.hits;
  })).length > 0;
};

Creep.prototype.index = function() {
  var parts;
  parts = this.name.split("_");
  return parts[parts.length - 2];
};

Creep.prototype.log = function() {
  var msg;
  msg = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  if (!((Config.LogFilter != null) && this.name.indexOf(Config.LogFilter) < 0)) {
    return console.log.apply(console, ["[" + this.name + "]"].concat(slice.call(msg)));
  }
};

Game.killAllCreeps = function() {
  var c, n, ref, results;
  Game.memory = {};
  ref = Game.creeps;
  results = [];
  for (n in ref) {
    c = ref[n];
    results.push(c.suicide());
  }
  return results;
};

Config = require('config');

if (!Config.CpuOverride) {
  if (Game.cpu.bucket < 500) {
    return;
  }
}

Roles = require('roles');

Tasks = require('tasks');

PathUtils = require('path_utils');

Utils = require('utils');

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES);

primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS);

primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS);

primaryTower = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_TOWER;
})[0];

primaryStorage = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_STORAGE;
})[0] || primarySpawn;

room1Pos = (ref = Game.flags.Room1) != null ? ref.pos : void 0;

room2 = (ref1 = Game.flags.Room2) != null ? ref1.room : void 0;

room2Pos = (ref2 = Game.flags.Room2) != null ? ref2.pos : void 0;

room3 = (ref3 = Game.flags.Room3) != null ? ref3.room : void 0;

room3Pos = (ref4 = Game.flags.Room3) != null ? ref4.pos : void 0;

room4 = (ref5 = Game.flags.Room4) != null ? ref5.room : void 0;

room4Pos = (ref6 = Game.flags.Room4) != null ? ref6.pos : void 0;

room5 = (ref7 = Game.flags.Room5) != null ? ref7.room : void 0;

room5Pos = (ref8 = Game.flags.Room5) != null ? ref8.pos : void 0;

room6 = (ref9 = Game.flags.Room6) != null ? ref9.room : void 0;

room6Pos = (ref10 = Game.flags.Room6) != null ? ref10.pos : void 0;

roomNameToPos = {};

roomNameToPos[room1Pos != null ? room1Pos.roomName : void 0] = room1Pos;

roomNameToPos[room2Pos != null ? room2Pos.roomName : void 0] = room2Pos;

roomNameToPos[room3Pos != null ? room3Pos.roomName : void 0] = room3Pos;

roomNameToPos[room4Pos != null ? room4Pos.roomName : void 0] = room4Pos;

roomNameToPos[room5Pos != null ? room5Pos.roomName : void 0] = room5Pos;

roomNameToPos[room6Pos != null ? room6Pos.roomName : void 0] = room6Pos;

Game.roomNameToPos = roomNameToPos;

TaskCounts = {};

for (j = 0, len = Tasks.length; j < len; j++) {
  t = Tasks[j];
  TaskCounts[name1 = t.role] || (TaskCounts[name1] = 0);
  TaskCounts[t.role] += t.count;
}

Creeps = {};

ref11 = Game.creeps;
for (name in ref11) {
  creep = ref11[name];
  Creeps[creep.roleName()] = creep.id;
}

try {
  Waypointer = require('waypointer');
  Game.wp = new Waypointer();
} catch (_error) {
  e = _error;
  console.log("Failed to intialize waypoints!");
  console.log(e);
  console.log(e.stack);
}

serializeArg = function(arg) {
  if (arg.id != null) {
    return {
      'id': arg.id
    };
  }
  if (typeof Utils[arg] === 'function') {
    return {
      'function': arg
    };
  }
  return arg;
};

resolveArgs = function(creep) {
  return function(arg) {
    if (arg.id != null) {
      return Game.getObjectById(arg.id);
    }
    if ((arg["function"] != null) && typeof Utils[arg["function"]] === 'function') {
      return Utils[arg["function"]](creep);
    }
    if ((arg != null) && typeof Utils[arg] === 'function') {
      return Utils[arg](creep);
    }
    if (arg["function"] != null) {
      return arg["function"];
    }
    return arg;
  };
};

Role = (function() {
  function Role() {}

  Role.prototype.run = function(realStartCpu) {
    var _, creepEnergy, endCpu, n, ref12, roomCpu, spawn, startCpu, storage, timings, towerEnergy;
    startCpu = Game.cpu.getUsed();
    try {
      ref12 = Game.spawns;
      for (_ in ref12) {
        spawn = ref12[_];
        if (cpuOverBudget()) {
          continue;
        }
        storage = spawn.room.find(FIND_MY_STRUCTURES).filter(function(s) {
          return s.structureType === STRUCTURE_STORAGE;
        })[0];
        towerEnergy = this.runTowers(spawn.room);
        this.runSpawner(spawn);
        creepEnergy = ((function() {
          var k, len1, ref13, results;
          ref13 = spawn.room.find(FIND_MY_CREEPS);
          results = [];
          for (k = 0, len1 = ref13.length; k < len1; k++) {
            creep = ref13[k];
            results.push(creep.carry.energy);
          }
          return results;
        })()).sum();
        console.log(" Spawn: " + (this.spawnEnergy(spawn.room)) + "/" + (this.spawnEnergyCapacity(spawn.room)) + "\tTower: " + towerEnergy + "\tCreep: " + creepEnergy + "\tStore: " + (storage != null ? storage.store.energy : void 0) + "\t");
      }
    } catch (_error) {
      e = _error;
      console.log("Failed to run spawn: " + e.stack);
    }
    roomCpu = Game.cpu.getUsed();
    try {
      timings = this.runCreeps();
    } catch (_error) {
      e = _error;
      console.log(e);
      console.log(e.stack);
    }
    endCpu = Game.cpu.getUsed();
    console.log("Time total: " + (endCpu - realStartCpu) + "\t\t Load: " + (startCpu - realStartCpu) + "\t\tCode: " + (endCpu - startCpu) + "\t\tBase: " + (roomCpu - startCpu) + "\t\t Creep: " + (endCpu - roomCpu) + "\t\tCPU Bucket: " + Game.cpu.bucket);
    if ((endCpu - roomCpu) > 20) {
      return console.log(((function() {
        var results;
        results = [];
        for (n in timings) {
          t = timings[n];
          if (t > 10) {
            results.push(n + ": " + t);
          }
        }
        return results;
      })()).join("\n"));
    }
  };

  Role.prototype.runSpawner = function(spawn) {
    var creepId, curCreepCount, idx, k, l, len1, ref12, ref13, results, roleName, start, waitingToSpawn;
    waitingToSpawn = false;
    if (spawn.spawning) {
      console.log(spawn.name + " Spawning " + (JSON.stringify(spawn.spawning)));
    }
    curCreepCount = {};
    results = [];
    for (k = 0, len1 = Tasks.length; k < len1; k++) {
      t = Tasks[k];
      if (t.spawn === 'Spawn2' && spawn.name !== 'Spawn2') {
        continue;
      }
      if (spawn.name === 'Spawn2' && t.spawn !== 'Spawn2') {
        continue;
      }
      if (t.count === 0) {
        continue;
      }
      start = curCreepCount[t.role] || 0;
      for (idx = l = ref12 = start, ref13 = start + t.count - 1; ref12 <= ref13 ? l <= ref13 : l >= ref13; idx = ref12 <= ref13 ? ++l : --l) {
        roleName = t.role + "_" + idx;
        creepId = Creeps[roleName];
        if (creepId == null) {
          if (!spawn.spawning && !waitingToSpawn) {
            if (t.count === 0) {
              continue;
            }
            if ((t.condition != null) && !t.condition()) {
              continue;
            }
            waitingToSpawn = this.spawnCreepFromTask(spawn, roleName, t);
          }
        } else {
          creep = Game.getObjectById(creepId);
          creep['action'] = t.action;
          if (t.args) {
            creep['args'] = t.args.map(serializeArg);
          }
        }
      }
      results.push(curCreepCount[t.role] = start + t.count);
    }
    return results;
  };

  Role.prototype.runTowers = function(room) {
    var attacked, energy, k, len1, nearestTarget, pathUtils, ref12, tower;
    room.my_structures = room.find(FIND_MY_STRUCTURES);
    room.my_creeps = room.find(FIND_MY_CREEPS);
    room.hostile_creeps = room.find(FIND_HOSTILE_CREEPS);
    energy = 0;
    attacked = false;
    ref12 = room.my_structures.filter(function(s) {
      return s.structureType === 'tower';
    });
    for (k = 0, len1 = ref12.length; k < len1; k++) {
      tower = ref12[k];
      pathUtils = new PathUtils(tower);
      try {
        nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter(function(c) {
          return c.body.filter(function(b) {
            return b.type === HEAL && b.hits;
          }).length > 0;
        }))[0];
        nearestTarget || (nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter(function(c) {
          return c.body.filter(function(b) {
            return b.type === RANGED_ATTACK && b.hits;
          }).length > 0;
        }))[0]);
      } catch (_error) {
        e = _error;
        console.log(e);
        console.log(e.stack);
      }
      nearestTarget || (nearestTarget = pathUtils.sortByDistance(room.hostile_creeps)[0]);
      if (nearestTarget != null) {
        attacked = true;
        tower.attack(nearestTarget);
      }
      if (!attacked && tower.energy > tower.energyCapacity * 0.75) {
        nearestTarget = pathUtils.sortByDistance(room.my_creeps.filter(function(c) {
          return c.hits < c.hitsMax;
        }))[0];
        if (nearestTarget != null) {
          tower.heal(nearestTarget);
        }
        nearestTarget = pathUtils.sortByDistance(room.my_structures.filter(Utils.needsRepair))[0];
        if (!nearestTarget) {
          nearestTarget = pathUtils.sortByDistance(room.find(FIND_STRUCTURES).filter(Utils.needsRepair))[0];
        }
        console.log("tower repair", nearestTarget);
        if (nearestTarget != null) {
          tower.repair(nearestTarget);
        }
      }
      energy += tower.energy;
    }
    return energy;
  };

  Role.prototype.runCreeps = function() {
    var _, creepId, k, len1, n, n_p, ref12, start, timings;
    timings = {};
    ref12 = shuffle((function() {
      var results;
      results = [];
      for (_ in Creeps) {
        creepId = Creeps[_];
        results.push(creepId);
      }
      return results;
    })());
    for (k = 0, len1 = ref12.length; k < len1; k++) {
      creepId = ref12[k];
      start = Game.cpu.getUsed();
      creep = Game.getObjectById(creepId);
      if (creep == null) {
        continue;
      }
      try {
        if (cpuOverBudget()) {
          break;
        }
        if (!creep.ticksToLive) {
          continue;
        }
        this.runCreep(creep);
      } catch (_error) {
        e = _error;
        console.log("Error running creeps " + creep.name + ": " + e);
        console.log(e.stack);
      } finally {
        n_p = creep.name.split("_");
        n = n_p.slice(0, n_p.length - 2).join("_");
        timings[n] || (timings[n] = 0);
        timings[n] += Game.cpu.getUsed() - start;
      }
    }
    return timings;
  };

  Role.prototype.spawnCreepFromTask = function(spawnFrom, roleName, task) {
    var memory, parts, partsCost, ret, room;
    room = spawnFrom.room;
    name = this.nameForRole(roleName);
    parts = this.makeRole(task.body);
    memory = task.memory || {};
    partsCost = this.partsCost(parts);
    if (partsCost > this.spawnEnergyCapacity(room)) {
      console.log("Can't spawn " + roleName + " due to max capacity -- have " + (this.spawnEnergyCapacity(room)) + "/" + partsCost);
      Game.notify("Can't spawn " + roleName + " due to max capacity -- have " + (this.spawnEnergyCapacity(room)) + "/" + partsCost, 60);
      return false;
      console.log("Would spawn creep " + name + " with " + memory + " and " + parts);
    }
    ret = 0;
    ret = spawnFrom.createCreep(parts, name, memory);
    if (ret === ERR_NOT_ENOUGH_RESOURCES) {
      console.log("Can't spawn " + roleName + " due to resources -- have " + (this.spawnEnergy(room)) + "/" + partsCost);
      return true;
    } else if (ret < 0) {
      console.log("Can't spawn " + roleName + " due to other error: " + ret + " -- have " + (this.spawnEnergy(room)) + "/" + partsCost);
      if (ret === -3) {
        Memory.totalCreepCounts[roleName]++;
      }
      return false;
    } else {
      if (ret === 0) {
        Memory.totalCreepCounts[roleName]++;
      }
      console.log("Spawning " + roleName + " named " + name + " from " + spawnFrom.name + " with " + parts + " and " + (JSON.stringify(memory)) + ", got " + ret);
    }
    return true;
  };

  Role.prototype.runCreep = function(creep) {
    var action, base;
    if (creep.memory == null) {
      console.log('bad memory');
      return;
    }
    if (creep.memory.role === 'piler') {
      return;
    }
    action = creep.action;
    if ((action != null) && (Roles[action] != null)) {
      return Roles[action].apply(Roles, [creep].concat(slice.call((creep.args || []).map(resolveArgs(creep)))));
    } else {
      creep.log("Failed to run action for " + creep.name + " - action = " + creep.action);
      (base = creep.memory).flailCount || (base.flailCount = 0);
      if (creep.memory.flailCount++ > 10) {
        return creep.suicide();
      }
    }
  };

  Role.prototype.partsCost = function(parts) {
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
        case CLAIM:
          return 600;
      }
    }).sum();
  };

  Role.prototype.makeRole = function(partsMap) {
    var count, i, k, part, parts, ref12;
    parts = [];
    for (part in partsMap) {
      count = partsMap[part];
      for (i = k = 0, ref12 = count; 0 <= ref12 ? k < ref12 : k > ref12; i = 0 <= ref12 ? ++k : --k) {
        parts.push(part);
      }
    }
    return parts;
  };

  Role.prototype.nameForRole = function(roleName) {
    var base;
    Memory.totalCreepCounts || (Memory.totalCreepCounts = {});
    (base = Memory.totalCreepCounts)[roleName] || (base[roleName] = 0);
    return roleName + "_" + Memory.totalCreepCounts[roleName];
  };

  Role.prototype.spawnEnergyCapacity = function(room) {
    var s;
    return ((function() {
      var k, len1, ref12, results;
      ref12 = room.find(FIND_MY_STRUCTURES);
      results = [];
      for (k = 0, len1 = ref12.length; k < len1; k++) {
        s = ref12[k];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energyCapacity);
        }
      }
      return results;
    })()).sum();
  };

  Role.prototype.spawnEnergy = function(room) {
    var s;
    return ((function() {
      var k, len1, ref12, results;
      ref12 = room.find(FIND_MY_STRUCTURES);
      results = [];
      for (k = 0, len1 = ref12.length; k < len1; k++) {
        s = ref12[k];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energy);
        }
      }
      return results;
    })()).sum();
  };

  return Role;

})();

r = new Role();

r.run(realStart);

//# sourceMappingURL=main.js.map
