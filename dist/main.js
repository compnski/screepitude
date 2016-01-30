var Agent, Builder, Cell, Config, Deliverator, Guard, Healbot, HunterKiller, MegaMiner, Mine, PathUtils, Upgrader, a, cell, creep, e, harvestOnly, mines, name, nearestTarget, primaryRoom, primarySpawn, primaryTower, ref, room2, room2mines, targetCounts, upgraders;

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

primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
  return s.structureType === 'tower';
})[0];

targetCounts = {
  source1: 0,
  tower_filler: 1,
  transporter: 6,
  source2: 0,
  mega_miner: 2,
  room2_mega_miner: 1,
  room2_mega_miner2: 1,
  room2_transporter: 8,
  mega_miner2: 2,
  repair: 2,
  builder: 1,
  upgrader: 3,
  upgrader_filler: 2,
  guard: 3,
  healbot: 2,
  hunter_killer: 2
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
      if (Game.flags.HuntersMark.room.name !== primaryRoom.name) {
        Game.flags.HuntersMark.setPosition(primarySpawn.pos);
      }
    } catch (_error) {
      e = _error;
      throw e;
      Game.notify("Failed to move flag!", 20);
    }
    try {
      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS));
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
      if (Game.flags.HuntersMark.room.name !== room2.name) {
        Game.flags.HuntersMark.setPosition(Game.flags.Room2.pos);
      }
    } catch (_error) {
      e = _error;
      throw e;
      Game.notify("Failed to move flag!", 20);
    }
  }
} catch (_error) {
  if (Config.ThrowExceptions) {
    throw e;
  }
  console.log("Caught exception! " + e);
}

try {
  cell = new Cell(primaryRoom, targetCounts);
  cell.loop();
  harvestOnly = cell.spawnFailed;
  mines = Mine.allInRoom(primaryRoom);
  room2mines = Mine.allInRoom(room2);
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

ref = Game.creeps;
for (name in ref) {
  creep = ref[name];
  try {
    switch (creep.memory.role.split(":")[0]) {
      case 'healbot':
        new Healbot(creep).loop(Game.flags.HuntersMark);
        break;
      case 'hunter_killer':
        new HunterKiller(creep).loop(Game.flags.HuntersMark);
        break;
      case 'guard':
        new Guard(creep).loop();
        break;
      case 'tower_filler':
        new Deliverator(creep, (function() {
          return primarySpawn;
        }), (function() {
          return primaryTower;
        })).loop();
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
        new MegaMiner(creep, room2mines[0].source).loop();
        break;
      case 'room2_mega_miner2':
        new MegaMiner(creep, room2mines[1].source).loop();
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
          return (new PathUtils(creep)).nearestEnergyProvider();
        }), (function() {
          return (new PathUtils(creep)).nearestEnergyNeed();
        })).loop();
        break;
      case 'repair':
        (!Config.NoRepairs ? new Deliverator(creep, (function() {
          return primarySpawn;
        }), (function() {
          return (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter(function(s) {
            return s.hits < s.hitsMax;
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
