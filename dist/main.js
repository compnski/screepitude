var Agent, Builder, Cell, Config, Deliverator, Guard, Healbot, HunterKiller, Mine, PathUtils, PositionMiner, Upgrader, _, a, cell, cellCpu, cpu, cpuByRole, cpuUsed, creep, creepByJob, creepEnergy, e, endCpu, harvestOnly, initCpu, loadCpu, mines, name, name1, nearestEnergyNeed, nearestTarget, primaryRoom, primarySpawn, primaryStorage, primaryTower, ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, role, room2, room2Pos, room2mines, room3, room3Pos, startCpu, targetCounts, upgraders;

startCpu = Game.cpu.getUsed();

if (Game.cpu.bucket < 500) {
  return;
}

Agent = require('agent');

Mine = require('mine');

Deliverator = require('deliverator');

Upgrader = require('upgrader');

Cell = require('cell');

Builder = require('builder');

Guard = require('guard');

Config = require('config');

PathUtils = require('path_utils');

Healbot = require('healbot');

HunterKiller = require('hunter_killer');

PositionMiner = require('position_miner');

targetCounts = {
  source1: 0,
  source2: 0,
  transporter: 2,
  position_miner1: 1,
  position_miner1_transport: 2,
  position_miner2: 1,
  position_miner2_transport: 2,
  position_miner3: 1,
  position_miner4: 1,
  position_miner3_transport: 3,
  position_miner4_transport: 4,
  position_miner5: 0,
  position_miner5_transport: 0,
  position_miner6: 0,
  position_miner6_transport: 0,
  tower_filler: 1,
  repair: !Config.NoRepairs ? 2 : void 0,
  builder: !Config.NoBuilders ? 2 : void 0,
  upgrader: !Config.NoUpgrades ? 3 : void 0,
  upgrader_filler: !Config.NoUpgrades ? 2 : void 0,
  guard: 3,
  healbot: 2,
  hunter_killer: 2,
  healbot_2: 2,
  hunter_killer_2: 2
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

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

primaryStorage = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
  return s.structureType === STRUCTURE_STORAGE;
})[0];

room2 = Game.flags.Room2.room;

room2Pos = Game.flags.Room2.pos;

room3 = Game.flags.Room3.room;

room3Pos = Game.flags.Room3.pos;

primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
  return s.structureType === 'tower';
})[0];

loadCpu = Game.cpu.getUsed();

console.log("Init took " + (loadCpu - startCpu));

try {
  if (((function() {
    var results;
    results = [];
    for (a in primaryRoom.find(FIND_HOSTILE_CREEPS)) {
      results.push(1);
    }
    return results;
  })()).length > 0) {
    console.log("Under Attack");
    targetCounts["guard"] = 10;
    Game.notify("Active BattleMode!! " + (primaryRoom.find(FIND_HOSTILE_CREEPS).length) + " hostile creeps in base!!");
    try {
      if (Game.flags.HuntersMark.pos.roomName !== primaryRoom.pos.roomName) {
        Game.flags.HuntersMark.setPosition(primarySpawn.pos);
      }
    } catch (_error) {
      e = _error;
      throw e;
      Game.notify("Failed to move flag!", 20);
    }
    try {
      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))[0];
      if (nearestTarget != null) {
        primaryTower.attack(nearestTarget);
      }
    } catch (_error) {
      e = _error;
      console.log("Failed to use tower!!!");
      Game.notify("Failed to use tower!!!", 20);
    }
  } else {
    try {
      if (Game.flags.HuntersMark.pos.roomName !== room2Pos.roomName) {
        Game.flags.HuntersMark.setPosition(room2Pos);
      }
    } catch (_error) {
      e = _error;
      console.log("failed to move flag");
      Game.notify("Failed to move flag!", 20);
      throw e;
    }
  }
  if (primaryTower.energy > primaryTower.energyCapacity / 2) {
    nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
      return s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
    }))[0];
    if (nearestTarget != null) {
      primaryTower.repair(nearestTarget);
    }
  }
} catch (_error) {
  console.log("Caught exception! " + e);
  if (Config.ThrowExceptions) {
    throw e;
  }
}

initCpu = Game.cpu.getUsed();

console.log("Defense took " + (initCpu - loadCpu));

try {
  cell = new Cell(primaryRoom, targetCounts);
  cell.loop();
  harvestOnly = cell.spawnFailed;
  mines = Mine.allInRoom(primaryRoom);
  if (room2) {
    room2mines = Mine.allInRoom(room2);
  }
} catch (_error) {
  e = _error;
  if (Config.ThrowExceptions) {
    throw e;
  }
  console.log("Caught exception! " + e);
}

cellCpu = Game.cpu.getUsed();

console.log("Cell took " + (cellCpu - initCpu));

upgraders = function() {
  var u;
  u = primaryRoom.find(FIND_MY_CREEPS).filter(function(c) {
    return c.memory.role === 'upgrader';
  });
  return u[parseInt(Math.random() * u.length)];
};

creepByJob = {};

ref = Game.creeps;
for (name in ref) {
  creep = ref[name];
  nearestEnergyNeed = function() {
    if (creep.pos.roomName !== primarySpawn.pos.roomName) {
      return new PathUtils(primarySpawn).nearestEnergyNeed();
    } else {
      return new PathUtils(creep).nearestEnergyNeed();
    }
  };
  role = creep.memory['role'];
  creepByJob[role] || (creepByJob[role] = []);
  creepByJob[role].push(creep);
}

creepEnergy = 0;

cpuByRole = {};

ref1 = Game.creeps;
for (_ in ref1) {
  creep = ref1[_];
  if (Game.cpu.bucket < 500) {
    continue;
  }
  if (Game.flags.ClearTargets != null) {
    delete creep.memory.sourceTarget;
    delete creep.memory.deliverTarget;
  }
  cpuUsed = Game.cpu.getUsed();
  try {
    switch (creep.memory.role.split(":")[0]) {
      case 'position_miner1':
        new PositionMiner(creep, (ref2 = Game.flags.Mine_1_1) != null ? ref2.pos : void 0).loop();
        break;
      case 'position_miner2':
        new PositionMiner(creep, (ref3 = Game.flags.Mine_1_2) != null ? ref3.pos : void 0).loop();
        break;
      case 'position_miner3':
        new PositionMiner(creep, (ref4 = Game.flags.Mine_2_2) != null ? ref4.pos : void 0).loop();
        break;
      case 'position_miner4':
        new PositionMiner(creep, (ref5 = Game.flags.Mine_2_1) != null ? ref5.pos : void 0).loop();
        break;
      case 'position_miner5':
        new PositionMiner(creep, (ref6 = Game.flags.Mine_3_1) != null ? ref6.pos : void 0).loop();
        break;
      case 'position_miner6':
        new PositionMiner(creep, (ref7 = Game.flags.Mine_3_2) != null ? ref7.pos : void 0).loop();
        break;
      case 'position_miner1_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner1']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'position_miner2_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner2']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'position_miner3_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner3']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'position_miner4_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner4']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'position_miner5_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner5']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'position_miner6_transport':
        new Deliverator(creep, (function() {
          var ref8;
          return (ref8 = creepByJob['position_miner6']) != null ? ref8[0] : void 0;
        }), function() {
          return primaryStorage;
        }).loop();
        break;
      case 'healbot':
        new Healbot(creep).loop(Game.flags.HuntersMark);
        break;
      case 'hunter_killer':
        new HunterKiller(creep).loop(Game.flags.HuntersMark);
        break;
      case 'healbot_2':
        new Healbot(creep).loop(Game.flags.HuntersMark2);
        break;
      case 'hunter_killer_2':
        new HunterKiller(creep).loop(Game.flags.HuntersMark2);
        break;
      case 'guard':
        new Guard(creep).loop();
        break;
      case 'tower_filler':
        if (primaryTower.energy < primaryTower.energyCapacity) {
          new Deliverator(creep, (function() {
            return primarySpawn;
          }), (function() {
            return primaryTower;
          })).loop();
        } else {
          if (!Config.NoBuilders) {
            new Builder(creep).loop();
          }
        }
        break;
      case !Config.NoUpgrades && 'upgrader_filler':
        new Deliverator(creep, (function() {
          return primaryStorage;
        }), upgraders).loop();
        break;
      case 'upgrader':
        if (!Config.NoUpgrades) {
          new Upgrader(creep).loop();
        }
        break;
      case !Config.NoBuilders && 'builder':
        new Builder(creep, function() {
          return primaryStorage;
        }).loop();
        break;
      case 'source2':
        new Deliverator(creep, (function() {
          return primaryRoom.find(FIND_SOURCES)[1];
        }), (function() {
          return (new PathUtils(creep)).nearestEnergyNeed();
        })).loop();
        break;
      case 'transporter':
        new Deliverator(creep, (function() {
          return primaryStorage;
        }), nearestEnergyNeed).loop();
        break;
      case 'source1':
        new Deliverator(creep, (function() {
          return primaryRoom.find(FIND_SOURCES)[0];
        }), (function() {
          return (new PathUtils(creep)).nearestEnergyNeed();
        })).loop();
        break;
      case 'repair':
        (!Config.NoRepairs ? new Deliverator(creep, (function() {
          return primarySpawn;
        }), (function() {
          return (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
            return s.structureType !== 'rampart' && s.hits < s.hitsMax;
          }))[0];
        })).loop() : void 0) || (!Config.NoBuilders ? new Builder(creep, function() {
          return primaryStorage;
        }).loop() : void 0);
        break;
      default:
        console.log("Orphan bot " + creep.name);
    }
  } catch (_error) {
    e = _error;
    if (Config.ThrowExceptions) {
      throw e;
    }
    console.log("Caught exception! " + e);
  } finally {
    creepEnergy += creep.carry.energy;
    cpuByRole[name1 = creep.memory.role] || (cpuByRole[name1] = 0);
    cpuByRole[creep.memory.role] += Game.cpu.getUsed() - cpuUsed;
  }
}

for (role in cpuByRole) {
  cpu = cpuByRole[role];
  console.log("Processed " + (role.paddingLeft("                                                ")) + " \tin " + (Math.trunc(cpu * 1000)) + " cpu");
}

endCpu = Game.cpu.getUsed();

console.log('-----');

console.log("Creeps took " + (endCpu - cellCpu));

console.log("Total took " + (endCpu - startCpu));

console.log(" Spawn: " + (cell.spawnEnergy()) + "\tTower: " + primaryTower.energy + "\tCreep: " + creepEnergy + "\tStore: " + primaryStorage.store.energy + "\tCPU Bucket: " + Game.cpu.bucket);

console.log('FIN');

//# sourceMappingURL=main.js.map
