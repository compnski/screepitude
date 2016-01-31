var Agent, Builder, Cell, Config, Deliverator, Guard, Healbot, HunterKiller, MegaMiner, Mine, PathUtils, Upgrader, _, a, cell, creep, creepByJob, e, harvestOnly, k, len, mines, name, nearestTarget, primaryRoom, primarySpawn, primaryTower, ref, ref1, ref2, ref3, role, room2, room2Pos, room2mines, room3, room3Pos, targetCounts, upgraders;

Agent = require('agent');

Mine = require('mine');

Deliverator = require('deliverator');

Upgrader = require('upgrader');

Cell = require('cell');

Builder = require('builder');

Guard = require('guard');

MegaMiner = require('mega_miner');

Config = require('config');

PathUtils = require('path_utils');

Healbot = require('healbot');

HunterKiller = require('hunter_killer');

Array.prototype.shuffle = function() {
  var a, i, j, t;
  a = this;
  i = a.length;
  while (--i > 0) {
    j = ~~(Math.random() * (i + 1));
    t = a[j];
    a[j] = a[i];
    a[i] = t;
  }
  return a;
};

Array.prototype.sum = function() {
  if (!this.length) {
    return 0;
  }
  return this.reduce(function(a, b) {
    return a + b;
  });
};

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

room2 = Game.flags.Room2.room;

room2Pos = Game.flags.Room2.pos;

room3 = Game.flags.Room3.room;

room3Pos = Game.flags.Room3.pos;

primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
  return s.structureType === 'tower';
})[0];

targetCounts = {
  source1: 0,
  source2: 0,
  tower_filler: 1,
  mega_miner2: 1,
  transporter: 5,
  mega_miner: 1,
  repair: 2,
  builder: 1,
  upgrader: 3,
  upgrader_filler: 2,
  guard: 3,
  healbot: 2,
  hunter_killer: 2,
  healbot_2: 2,
  hunter_killer_2: 2,
  room2_mega_miner2: 1,
  room2_transporter: 8,
  room2_mega_miner: 1,
  position_miner1: 1,
  position_miner1_transport: 3,
  position_miner2: 1,
  position_miner2_transport: 3
};

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
    nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter(function(s) {
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
  role = creep.memory['role'];
  creepByJob[role] || (creepByJob[role] = []);
  creepByJob[role].push(creep);
}

ref1 = ((function() {
  var ref1, results;
  ref1 = Game.creeps;
  results = [];
  for (_ in ref1) {
    creep = ref1[_];
    results.push(creep);
  }
  return results;
})()).shuffle();
for (k = 0, len = ref1.length; k < len; k++) {
  creep = ref1[k];
  if (Game.flags.ClearTargets != null) {
    delete creep.memory.sourceTarget;
    delete creep.memory.deliverTarget;
  }
  try {
    switch (creep.memory.role.split(":")[0]) {
      case 'position_miner1':
        new PositionMiner(creep, (ref2 = Game.flags.Mine_3_0) != null ? ref2.pos : void 0).loop();
        break;
      case 'position_miner2':
        new PositionMiner(creep, (ref3 = Game.flags.Mine_3_1) != null ? ref3.pos : void 0).loop();
        break;
      case 'position_miner1_transport':
        new Deliverator(creep, (function() {
          return creepByJob['position_miner1'][0];
        }), (function() {
          return primarySpawn;
        })).loop();
        break;
      case 'position_miner2_transport':
        new Deliverator(creep, (function() {
          return creepByJob['position_miner2'][0];
        }), (function() {
          return primarySpawn;
        })).loop();
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
      case 'upgrader_filler':
        new Deliverator(creep, (function() {
          return primarySpawn;
        }), upgraders).loop();
        break;
      case 'mega_miner':
        new MegaMiner(creep, mines[0].source).loop();
        break;
      case 'mega_miner2':
        new MegaMiner(creep, mines[1].source).loop();
        break;
      case 'room2_mega_miner':
        if (room2 != null) {
          new MegaMiner(creep, room2mines[0].source).loop();
        }
        break;
      case 'room2_mega_miner2':
        if (room2 != null) {
          new MegaMiner(creep, room2mines[1].source).loop();
        }
        break;
      case 'upgrader':
        if (!Config.NoUpgrades) {
          new Upgrader(creep).loop();
        }
        break;
      case 'builder':
        if (!Config.NoBuilders) {
          new Builder(creep).loop();
        }
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
          return (new PathUtils(creep)).nearestEnergyProvider();
        }), (function() {
          return (new PathUtils(creep)).nearestEnergyNeed();
        })).loop();
        break;
      case 'room2_transporter':
        new Deliverator(creep, (function() {
          return (new PathUtils(creep)).nearestEnergyProvider(room2);
        }), (function() {
          return (new PathUtils(creep)).nearestEnergyNeed(primaryRoom);
        })).loop();
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
        })).loop() : void 0) || (!Config.NoBuilders ? new Builder(creep).loop() : void 0);
    }
  } catch (_error) {
    e = _error;
    if (Config.ThrowExceptions) {
      throw e;
    }
    console.log("Caught exception! " + e);
  }
}

//# sourceMappingURL=main.js.map
