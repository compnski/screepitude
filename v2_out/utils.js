var Config, Creeps, TaskCounts, Tasks, Utils, creep, i, len, name, name1, primaryRoom, primarySpawn, primaryStorage, primaryTower, ref, t, t1;

Config = require('config');

Tasks = require('tasks');

t1 = Game.cpu.getUsed();

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

primaryTower = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_TOWER;
})[0];

primaryStorage = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_STORAGE;
})[0] || primarySpawn;

TaskCounts = {};

for (i = 0, len = Tasks.length; i < len; i++) {
  t = Tasks[i];
  TaskCounts[name1 = t.role] || (TaskCounts[name1] = 0);
  TaskCounts[t.role] += t.count;
}

Creeps = {};

ref = Game.creeps;
for (name in ref) {
  creep = ref[name];
  Creeps[creep.roleName()] = creep.id;
}

Utils = (function() {
  function Utils() {}

  Utils.minerByIndex = function(index) {
    index = index % TaskCounts["miner"];
    return Game.getObjectById(Creeps["miner_" + index]);
  };

  Utils.isAlly = function(username) {
    return ['omgbear', 'ganz', 'fezeral', 'scorps'].indexOf() > -1;
  };

  Utils.isEnemy = function(username) {
    return !Utils.isAlly(username);
  };

  Utils.primarySpawnOrExtension = function() {
    return primaryRoom.my_structures.filter(function(c) {
      return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
    });
  };

  Utils.nearestTowerSpawnExtension = function(creep) {
    var base, priority_targets, targets;
    (base = creep.room).my_structures || (base.my_structures = creep.room.find(FIND_MY_STRUCTURES));
    priority_targets = creep.room.my_structures.filter(function(c) {
      return (c.structureType === 'tower') && c.energy < c.energyCapacity * 0.33;
    });
    if (priority_targets.length) {
      return creep.pos.findClosestByPath(priority_targets);
    }
    targets = creep.room.my_structures.filter(function(c) {
      return (c.structureType === 'tower') && c.energy < c.energyCapacity * 0.66;
    });
    targets = targets.concat(creep.room.my_structures.filter(function(c) {
      return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
    }));
    if (targets.length === 0) {
      targets = creep.room.my_structures.filter(function(c) {
        return (c.structureType === 'tower') && c.energy < c.energyCapacity;
      });
    }
    return creep.pos.findClosestByPath(targets);
  };

  Utils.nearestStorage = function(creep) {
    var base, targets;
    (base = creep.room).my_structures || (base.my_structures = creep.room.find(FIND_MY_STRUCTURES));
    targets = creep.room.my_structures.filter(function(s) {
      return s.structureType === STRUCTURE_STORAGE;
    });
    if (!targets.length) {
      targets = creep.room.my_structures.filter(function(s) {
        return s.structureType === STRUCTURE_TOWER && s.energy > s.energyCapacity * 0.9;
      });
    }
    if (targets.length === 0) {
      return null;
    }
    return creep.pos.findClosestByPath(targets);
  };

  Utils.energyProviders = function(creep) {
    var s, storage;
    s = [];
    s = s.concat(creep.room.find(FIND_DROPPED_ENERGY).filter(function(s) {
      return creep.pos.getRangeTo(s) < 25;
    }));
    if (s.length === 0 && ((primaryStorage.store.energy || primaryStorage.energy) < 50 || creep.pos.getRangeTo(primaryStorage) > 25)) {
      s = s.concat(creep.room.find(FIND_SOURCES).filter((function(c) {
        return c.energy > 100 || c.ticksToRegeneration < 10;
      })));
    }
    storage = Utils.nearestStorage(creep);
    if (storage != null) {
      s.push(storage);
    }
    return s;
  };

  Utils.nearestEnergyProvider = function(creep) {
    var ep;
    ep = Utils.energyProviders(creep);
    if (!ep.length) {
      return null;
    }
    return creep.pos.findClosestByPath(ep);
  };

  Utils.mineFlagByIndex = function(creep) {
    return Config.MineFlags[creep.index() % Config.MineFlags.length - 1];
  };

  Utils.guardFlagByIndex = function(creep) {
    return GuardFlags[creep.index() % GuardFlags.length - 1];
  };

  Utils.needsRepair = function(s) {
    return s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
  };

  Utils.ownedByMe = function(s) {
    return s.owner && s.owner.username === 'omgbear';
  };

  return Utils;

})();

module.exports = Utils;

//# sourceMappingURL=utils.js.map
