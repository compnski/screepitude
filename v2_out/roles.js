var Builder, Config, Creeps, Deliverator, GuardFlags, MineFlags, PathUtils, Role, TaskCounts, Tasks, Utils, creep, isAlly, isEnemy, j, len, name, name1, primaryRoom, primarySpawn, primaryStorage, ref, resolveArgs, serializeArg, t, t1,
  slice = [].slice,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

PathUtils = require('path_utils');

Deliverator = require('deliverator');

Config = require('config');

Tasks = require('tasks');

isAlly = function(username) {
  return ['omgbear', 'ganz', 'fezeral', 'scorps'].indexOf() > -1;
};

isEnemy = function(username) {
  return !isAlly(username);
};

t1 = Game.cpu.getUsed();

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES);

primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS);

primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS);

primaryStorage = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_STORAGE;
})[0];

TaskCounts = {};

for (j = 0, len = Tasks.length; j < len; j++) {
  t = Tasks[j];
  TaskCounts[name1 = t.role] || (TaskCounts[name1] = 0);
  TaskCounts[t.role] += t.count;
}

Creeps = {};

ref = Game.creeps;
for (name in ref) {
  creep = ref[name];
  Creeps[creep.roleName()] = creep.id;
}

Utils = {};

Utils.CarryStuff = function(creep, from, to) {
  return new Deliverator(creep, from, to).loop();
};

Utils.primarySpawnOrExtension = function() {
  return primaryRoom.my_structures.filter(function(c) {
    return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
  });
};

Utils.nearestPrimarySpawnOrExtension = function(creep) {
  var targets;
  targets = new PathUtils(creep).sortByDistance(Utils.primarySpawnOrExtension());
  return targets[0];
};

Utils.nearestTowerSpawnExtension = function(creep) {
  var targets;
  targets = primaryRoom.my_structures.filter(function(c) {
    return (c.structureType === 'tower') && c.energy < c.energyCapacity;
  });
  if (targets.length === 0) {
    targets = Utils.primarySpawnOrExtension();
  }
  targets = new PathUtils(creep).sortByDistance(targets);
  return targets[0];
};

Utils.energyProviders = function(creep) {
  var s;
  s = creep.room.find(FIND_MY_CREEPS).filter(function(c) {
    return c.carryCapacity > 200 && c.carry.energy > 100;
  });
  s.push(primaryStorage);
  return s;
};

Utils.mineFlagByIndex = function(creep) {
  return MineFlags[creep.index() % MineFlags.length - 1];
};

Utils.guardFlagByIndex = function(creep) {
  return GuardFlags[creep.index() % GuardFlags.length - 1];
};

Utils.Repair = function(creep, source) {
  return new Deliverator(creep, source, new PathUtils(creep).sortByDistance(primaryRoom.my_structures.filter(function(s) {
    return s.structureType !== 'rampart' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
  }))[0]).loop();
};

Utils.BuildThings = function(creep) {
  return new Builder(creep, null, Game.flags.BuildHere).loop();
};

Utils.HealFlag = function(creep, rally, leash_distance) {
  var nearestTarget, pathUtils, room;
  if (leash_distance == null) {
    leash_distance = 5;
  }
  rally || (rally = Game.flags.HuntersMark2);
  if (!creep.pos.inRangeTo(rally, leash_distance + 3)) {
    return creep.moveTo(rally.pos, {
      ignoreDestructibleStructures: true,
      maxOps: 1000
    });
  }
  room = creep.room;
  if (room.friendly_creeps == null) {
    room.friendly_creeps = room.find(FIND_MY_CREEPS);
  }
  pathUtils = new PathUtils(creep);
  nearestTarget = pathUtils.sortByDistance(room.friendly_creeps.filter(function(c) {
    return c.hits < c.hitsMax;
  }))[0];
  if ((nearestTarget != null) && rally.pos.getRangeTo(nearestTarget) > leash_distance) {
    nearestTarget = null;
  }
  if (nearestTarget != null) {
    if (creep.rangedHeal(nearestTarget) === ERR_NOT_IN_RANGE) {
      return creep.moveTo(nearestTarget);
    }
  } else {
    return creep.moveTo(rally.pos);
  }
};

Utils.GuardFlag = function(creep, rally, leash_distance) {
  var attacked, err, nearestTarget, pathUtils, room;
  if (leash_distance == null) {
    leash_distance = 5;
  }
  rally || (rally = Game.flags.HuntersMark2);
  if (!creep.pos.inRangeTo(rally, leash_distance)) {
    creep.log("Too far");
    return creep.moveTo(rally.pos);
  }
  room = creep.room;
  if (room.hostile_creeps == null) {
    room.hostile_creeps = room.find(FIND_HOSTILE_CREEPS);
  }
  nearestTarget = null;
  pathUtils = new PathUtils(creep);
  nearestTarget || (nearestTarget = pathUtils.sortByDistance(room.hostile_creeps)[0]);
  if ((nearestTarget != null) && rally.pos.getRangeTo(nearestTarget) > leash_distance) {
    nearestTarget = null;
  }
  if (nearestTarget != null) {
    console.log("Nearing in on " + nearestTarget.id + " at " + (creep.pos.getRangeTo(nearestTarget)));
    attacked = true;
    if (creep.body.filter(function(p) {
      return p.type === ATTACK && p.hits > 0;
    }).length > 0 && isEnemy(nearestTarget.owner.username)) {
      if ((err = creep.attack(nearestTarget)) === ERR_NOT_IN_RANGE) {
        creep.moveTo(nearestTarget);
      }
    }
    if (creep.body.filter(function(p) {
      return p.type === RANGED_ATTACK && p.hits > 0;
    }).length > 0 && isEnemy(nearestTarget.owner.username)) {
      if ((err = creep.rangedAttack(nearestTarget)) === ERR_NOT_IN_RANGE) {
        return creep.moveTo(nearestTarget);
      }
    }
  } else {
    return creep.moveTo(rally.pos);
  }
};

Utils.minerByIndex = function(index) {
  index = index % TaskCounts["miner"];
  return Game.getObjectById(Creeps["miner_" + index]);
};

GuardFlags = [Game.flags.HuntersMark2];

MineFlags = [Game.flags.Mine_1_1, Game.flags.Mine_1_2, Game.flags.Mine_3_1, Game.flags.Mine_3_2, Game.flags.Mine_4_1];

Utils.FlagMiner = function(creep) {
  var err, index, source, targetFlag;
  if (creep.carry.energy === creep.carryCapacity) {
    return;
  }
  index = creep.index();
  targetFlag = MineFlags[index % MineFlags.length];
  if (targetFlag.pos.roomName !== creep.pos.roomName) {
    err = creep.moveTo(targetFlag.pos, {
      reusePath: 40,
      ignoreCreeps: false,
      maxOps: 1000
    });
    if (err !== 0) {
      console.log("flag miner error = " + err);
    }
    return;
  }
  if (!creep.memory.sourceId) {
    creep.memory.sourceId = new PathUtils(targetFlag.pos).sortByDistance(targetFlag.room.find(FIND_SOURCES))[0].id;
  }
  if (creep.memory.sourceId) {
    source = Game.getObjectById(creep.memory.sourceId);
  }
  if (!creep.pos.isNearTo(source.pos)) {
    creep.moveTo(source, {
      reusePath: 10
    });
  }
  if (creep.harvest(source) === -7) {
    return delete creep.memory.sourceId;
  }
};

Utils.MineTransporter = function(creep, dumpLocation) {
  var source;
  source = Utils.minerByIndex(creep.index());
  if (source != null) {
    return new Deliverator(creep, source, dumpLocation).loop();
  }
};

serializeArg = function(arg) {
  if (arg.id != null) {
    return {
      'id': arg.id
    };
  }
  if (typeof Utils[arg["function"]] === 'function') {
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
    var _, creepEnergy, endCpu, ref1, roomCpu, spawn, startCpu, storage, towerEnergy;
    startCpu = Game.cpu.getUsed();
    ref1 = Game.spawns;
    for (_ in ref1) {
      spawn = ref1[_];
      storage = spawn.room.find(FIND_MY_STRUCTURES).filter(function(s) {
        return s.structureType === STRUCTURE_STORAGE;
      })[0];
      towerEnergy = this.runTowers(spawn.room);
      this.runSpawner(spawn);
      creepEnergy = ((function() {
        var k, len1, ref2, results;
        ref2 = spawn.room.find(FIND_MY_CREEPS);
        results = [];
        for (k = 0, len1 = ref2.length; k < len1; k++) {
          creep = ref2[k];
          results.push(creep.carry.energy);
        }
        return results;
      })()).sum();
      console.log(" Spawn: " + (this.spawnEnergy(spawn.room)) + "/" + (this.spawnEnergyCapacity(spawn.room)) + "\tTower: " + towerEnergy + "\tCreep: " + creepEnergy + "\tStore: " + storage.store.energy + "\t");
    }
    roomCpu = Game.cpu.getUsed();
    this.runCreeps();
    endCpu = Game.cpu.getUsed();
    return console.log("Time total: " + (endCpu - realStartCpu) + "\t\t Load: " + (startCpu - realStartCpu) + "\t\tCode: " + (endCpu - startCpu) + "\t\tBase: " + (roomCpu - startCpu) + "\t\t Creep: " + (endCpu - roomCpu) + "\t\tCPU Bucket: " + Game.cpu.bucket);
  };

  Role.prototype.runSpawner = function(spawn) {
    var creepId, curCreepCount, idx, k, l, len1, name2, ref1, ref2, roleName, start;
    if (spawn.spawning) {
      console.log("Spawning " + (JSON.stringify(spawn.spawning)));
    }
    curCreepCount = {};
    for (k = 0, len1 = Tasks.length; k < len1; k++) {
      t = Tasks[k];
      start = curCreepCount[t.role] || 0;
      for (idx = l = ref1 = start, ref2 = start + t.count - 1; ref1 <= ref2 ? l <= ref2 : l >= ref2; idx = ref1 <= ref2 ? ++l : --l) {
        roleName = t.role + "_" + idx;
        creepId = Creeps[roleName];
        if (creepId == null) {
          if (!spawn.spawning) {
            if (this.spawnCreepFromTask(spawn, roleName, t)) {
              return;
            }
          }
        } else {
          creep = Game.getObjectById(creepId);
          if (creep.memory.action != null) {
            continue;
          }
          creep.memory = Memory[name2 = creep.name] || (Memory[name2] = {});
          creep.memory.action = t.action;
          creep.memory.roleName = roleName;
          creep.memory.args = t.args;
        }
      }
      curCreepCount[t.role] = start + idx;
    }
  };

  Role.prototype.runTowers = function(room) {
    var attacked, energy, k, len1, nearestTarget, pathUtils, ref1, tower;
    energy = 0;
    ref1 = tower = room.my_structures.filter(function(s) {
      return s.structureType === 'tower';
    });
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      tower = ref1[k];
      pathUtils = new PathUtils(tower);
      nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter(function(c) {
        return c.body.indexOf(HEAL) > -1;
      }))[0];
      nearestTarget || (nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter(function(c) {
        return c.body.indexOf(RANGED_ATTACK) > -1;
      }))[0]);
      nearestTarget || (nearestTarget = pathUtils.sortByDistance(room.hostile_creeps)[0]);
      if (nearestTarget != null) {
        attacked = true;
        tower.attack(nearestTarget);
      }
      if (!attacked && tower.energy > tower.energyCapacity / 2) {
        nearestTarget = pathUtils.sortByDistance(room.my_creeps.filter(function(c) {
          return c.hits < c.hitsMax;
        }));
        if (nearestTarget != null) {
          tower.heal(nearestTarget);
        }
        nearestTarget = pathUtils.sortByDistance(room.my_structures.filter(function(s) {
          return s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
        }))[0];
        if (nearestTarget == null) {
          nearestTarget = pathUtils.sortByDistance(room.find(FIND_STRUCTURES).filter(function(s) {
            return s.structureType === STRUCTURE_ROAD && s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
          }))[0];
        }
        if (nearestTarget != null) {
          tower.repair(nearestTarget);
        }
      }
      energy += tower.energy;
    }
    return energy;
  };

  Role.prototype.runCreeps = function() {
    var _, creepId, e, results;
    results = [];
    for (_ in Creeps) {
      creepId = Creeps[_];
      creep = Game.getObjectById(creepId);
      try {
        results.push(this.runCreep(creep));
      } catch (_error) {
        e = _error;
        creep.log(creep);
        creep.log(e.stack);
        results.push(creep.log("Error running creeps " + creep.role + "_" + creep.index));
      }
    }
    return results;
  };

  Role.prototype.spawnCreepFromTask = function(spawnFrom, roleName, task) {
    var memory, parts, partsCost, ret, room;
    room = spawnFrom.room;
    name = this.nameForRole(roleName);
    parts = this.makeRole(task.body);
    memory = {
      'action': task.action,
      args: task.args.map(serializeArg),
      roleName: roleName
    };
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
        room.memory.totalCreepCounts[roleName]++;
      }
      return false;
    } else {
      if (ret === 0) {
        room.memory.totalCreepCounts[roleName]++;
      }
      console.log("Spawning " + roleName + " named " + name + " from " + spawnFrom.name + " with " + parts + " and " + (JSON.stringify(memory)) + ", got " + ret);
    }
    return true;
  };

  Role.prototype.runCreep = function(creep) {
    var action;
    action = creep.memory.action;
    if ((action != null) && (Utils[action] != null)) {
      return Utils[action].apply(Utils, [creep].concat(slice.call(creep.memory.args.map(resolveArgs(creep)))));
    } else {
      return creep.log("Failed to run action for " + creep.name + " - action = " + creep.action + ", memory = " + (JSON.stringify(creep.memory)));
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
      }
    }).sum();
  };

  Role.prototype.makeRole = function(partsMap) {
    var count, i, k, part, parts, ref1;
    parts = [];
    for (part in partsMap) {
      count = partsMap[part];
      for (i = k = 0, ref1 = count; 0 <= ref1 ? k < ref1 : k > ref1; i = 0 <= ref1 ? ++k : --k) {
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
      var k, len1, ref1, results;
      ref1 = room.find(FIND_MY_STRUCTURES);
      results = [];
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        s = ref1[k];
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
      var k, len1, ref1, results;
      ref1 = room.find(FIND_MY_STRUCTURES);
      results = [];
      for (k = 0, len1 = ref1.length; k < len1; k++) {
        s = ref1[k];
        if (s.structureType === 'extension' || s.structureType === "spawn") {
          results.push(s.energy);
        }
      }
      return results;
    })()).sum();
  };

  return Role;

})();

Builder = (function(superClass) {
  extend(Builder, superClass);

  function Builder(creep1, sourceFn, rallyFlag) {
    var source;
    this.creep = creep1;
    if (sourceFn == null) {
      sourceFn = null;
    }
    if (rallyFlag == null) {
      rallyFlag = null;
    }
    this.constructionSite = bind(this.constructionSite, this);
    if (rallyFlag != null) {
      this.target = rallyFlag;
    } else {
      this.target = creep;
    }
    if (sourceFn == null) {
      this.pathUtils || (this.pathUtils = new PathUtils(this.target));
      source = this.pathUtils.sortByDistance(Utils.energyProviders(creep))[0];
      console.log(source);
    }
    Builder.__super__.constructor.call(this, creep, source, this.constructionSite());
    creep.memory.energyRequester = true;
  }

  Builder.prototype.ramparts = function(s) {
    return (s.structureType === 'rampart') && (s.hits < Math.min(Config.MaxWallHP, s.hitsMax));
  };

  Builder.prototype.walls = function(s) {
    return s.structureType === 'constructedWall' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP || 3000000);
  };

  Builder.prototype.constructionSite = function() {
    var ref1, ref2, ref3, ref4, sites;
    this.pathUtils || (this.pathUtils = new PathUtils(this.target));
    sites = this.pathUtils.sortByDistance(this.creep.room.find(FIND_MY_CONSTRUCTION_SITES));
    if (sites.length === 0) {
      sites = [];
      sites = sites.concat((ref1 = Game.flags.Room2) != null ? (ref2 = ref1.room) != null ? ref2.find(FIND_MY_CONSTRUCTION_SITES) : void 0 : void 0);
      sites = sites.concat((ref3 = Game.flags.Room3) != null ? (ref4 = ref3.room) != null ? ref4.find(FIND_MY_CONSTRUCTION_SITES) : void 0 : void 0);
      sites = this.pathUtils.sortByDistance(sites);
    }
    if (sites.length === 0) {
      sites = this.pathUtils.sortByDistance(this.creep.room.find(FIND_MY_STRUCTURES).filter(this.ramparts));
    }
    if (sites.length === 0) {
      sites = this.pathUtils.sortByDistance(this.creep.room.find(FIND_STRUCTURES).filter(this.walls));
    }
    return sites[0];
  };

  return Builder;

})(Deliverator);

module.exports = Role;

//# sourceMappingURL=roles.js.map
