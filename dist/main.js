var main, startCpu;

if (Game.cpu.bucket < 1500) {
  Game.notify("CPU LOW!", 20);
  main = false;
}

startCpu = Game.cpu.getUsed();

if (main == null) {
  main = function() {
    var Agent, Builder, Cell, Config, Deliverator, Guard, Healbot, HunterKiller, Mine, PathUtils, PositionMiner, _, a, cell, cellCpu, cpu, cpuByRole, cpuUsed, creep, creepByJob, creepEnergy, e, endCpu, harvestOnly, initCpu, loadCpu, name, name1, nearestEnergyNeed, nearestTarget, primaryRoom, primarySpawn, primaryStorage, primaryTower, ref, ref1, role, room1Pos, room2, room2Pos, room3, room3Pos, room4, room4Pos, roomNameToPos, targetCounts, upgraders;
    primarySpawn = Game.spawns.Spawn1;
    primaryRoom = primarySpawn.room;
    primaryStorage = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
      return s.structureType === STRUCTURE_STORAGE;
    })[0];
    room1Pos = Game.flags.Room1.pos;
    room2 = Game.flags.Room2.room;
    room2Pos = Game.flags.Room2.pos;
    room3 = Game.flags.Room3.room;
    room3Pos = Game.flags.Room3.pos;
    room4 = Game.flags.Room4.room;
    room4Pos = Game.flags.Room4.pos;
    roomNameToPos = {};
    roomNameToPos[room1Pos.roomName] = room1Pos;
    roomNameToPos[room2Pos.roomName] = room2Pos;
    roomNameToPos[room3Pos.roomName] = room3Pos;
    roomNameToPos[room4Pos.roomName] = room4Pos;
    Game.roomNameToPos = roomNameToPos;
    Agent = require('agent');
    Mine = require('mine');
    Deliverator = require('deliverator');
    Cell = require('cell');
    Builder = require('builder');
    Guard = require('guard');
    Config = require('config');
    PathUtils = require('path_utils');
    Healbot = require('healbot');
    HunterKiller = require('hunter_killer');
    PositionMiner = require('position_miner');
    targetCounts = {
      small_transporter: 1,
      source1: 0,
      source2: 0,
      transporter: 0,
      position_miner1: 1,
      position_miner1_transport: 1,
      position_miner2: 1,
      position_miner2_transport: 1,
      hunter_killer: 2,
      healbot: 2,
      position_miner3: 1,
      position_miner4: 0,
      position_miner3_transport: 3,
      position_miner4_transport: 0,
      far_builder: 1,
      position_miner5: 1,
      position_miner5_transport: 3,
      position_miner6: 1,
      position_miner6_transport: 3,
      tower_filler: 1,
      transporter: 1,
      repair: !Config.NoRepairs ? 1 : void 0,
      builder: !Config.NoBuilders ? 1 : void 0,
      upgrader: !Config.NoUpgrades ? 4 : void 0,
      upgrader_filler: !Config.NoUpgrades ? 0 : void 0,
      guard: 3,
      hunter_killer_2: 2,
      healbot_2: 2
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
    primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter(function(s) {
      return s.structureType === 'tower';
    })[0];
    loadCpu = Game.cpu.getUsed();
    console.log("Init took " + (loadCpu - startCpu));
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
          nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))[0];
          if (nearestTarget != null) {
            primaryTower.attack(nearestTarget);
          }
        } catch (_error) {
          e = _error;
          console.log("Failed to use tower!!!");
          Game.notify("Failed to use tower!!!", 20);
        }
      }
      if (primaryTower.energy > primaryTower.energyCapacity / 2) {
        nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_MY_CREEPS).filter(function(c) {
          return c.hits < c.hitsMax;
        }));
        if (nearestTarget != null) {
          primaryTower.heal(nearestTarget);
        }
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
    if (Game.cpu.bucket < 1800) {
      Game.notify("CPU LOW!", 20);
      return;
    }
    try {
      cell = new Cell(primaryRoom, targetCounts);
      cell.loop();
      harvestOnly = cell.spawnFailed;
    } catch (_error) {
      e = _error;
      if (Config.ThrowExceptions) {
        throw e;
      }
      console.log("Caught exception! " + e);
    }
    cellCpu = Game.cpu.getUsed();
    console.log("Cell took " + (cellCpu - initCpu));
    if (Game.cpu.bucket < 2200 && Game.time % 5 === 0) {
      return;
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
        switch (creep.memory.role) {
          case 'position_miner1':
            new PositionMiner(creep, Game.flags.Mine_1_1.pos).loop();
            break;
          case 'position_miner2':
            new PositionMiner(creep, Game.flags.Mine_1_2.pos).loop();
            break;
          case 'position_miner3':
            new PositionMiner(creep, Game.flags.Mine_4_1.pos).loop();
            break;
          case 'position_miner5':
            new PositionMiner(creep, Game.flags.Mine_3_1.pos).loop();
            break;
          case 'position_miner6':
            new PositionMiner(creep, Game.flags.Mine_3_2.pos).loop();
            break;
          case 'position_miner1_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner1']) != null ? ref2[0] : void 0;
            }), function() {
              return primaryStorage;
            }).loop();
            break;
          case 'position_miner2_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner2']) != null ? ref2[0] : void 0;
            }), function() {
              return primaryStorage;
            }).loop();
            break;
          case 'position_miner3_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner3']) != null ? ref2[0] : void 0;
            }), function() {
              return primaryStorage;
            }).loop();
            break;
          case 'position_miner4_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner4']) != null ? ref2[0] : void 0;
            }), function() {
              return primaryStorage;
            }).loop();
            break;
          case 'position_miner5_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner5']) != null ? ref2[0] : void 0;
            }), function() {
              return primaryStorage;
            }).loop();
            break;
          case 'position_miner6_transport':
            new Deliverator(creep, (function() {
              var ref2;
              return (ref2 = creepByJob['position_miner6']) != null ? ref2[0] : void 0;
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
                return primaryStorage;
              }), (function() {
                return primaryTower;
              })).loop();
            } else {
              continue;
            }
            break;
          case !Config.NoUpgrades && 'upgrader_filler':
            new Deliverator(creep, (function() {
              return primaryStorage;
            }), upgraders).loop();
            break;
          case 'upgrader':
            if (!Config.NoUpgrades) {
              new Deliverator(creep, (function() {
                return primaryStorage;
              }), (function() {
                return creep.room.controller;
              })).loop();
            }
            break;
          case !Config.NoBuilders && 'builder':
            new Builder(creep, (function() {
              return primaryStorage;
            })).loop();
            break;
          case !Config.NoBuilders && 'far_builder':
            new Builder(creep, null, Game.flags.BuildHere).loop();
            break;
          case 'source1':
            new Deliverator(creep, (function() {
              return primaryRoom.find(FIND_SOURCES)[0];
            }), (function() {
              return (new PathUtils(creep)).nearestEnergyNeed();
            })).loop();
            break;
          case 'source2':
            new Deliverator(creep, (function() {
              return primaryRoom.find(FIND_SOURCES)[1];
            }), (function() {
              return (new PathUtils(creep)).nearestEnergyNeed();
            })).loop();
            break;
          case 'transporter':
          case "small_transporter":
            nearestEnergyNeed = function() {
              var targets;
              if (creep.pos.roomName !== primarySpawn.pos.roomName) {
                return new PathUtils(primarySpawn).nearestEnergyNeed();
              } else {
                targets = new PathUtils(creep).sortByDistance(creep.room.find(FIND_MY_STRUCTURES).filter(function(c) {
                  return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
                }));
                return targets[parseInt(Math.random() * Math.min(targets.length, 2))];
              }
            };
            new Deliverator(creep, (function() {
              return primaryStorage;
            }), nearestEnergyNeed).loop();
            break;
          case 'repair':
            if (!Config.NoRepairs) {
              new Deliverator(creep, (function() {
                return primaryStorage;
              }), (function() {
                return (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter(function(s) {
                  return s.structureType !== 'rampart' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP);
                }))[0];
              })).loop();
            }
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
      if (cpu > 1) {
        console.log("Processed " + (role.paddingLeft("                                                ")) + " \tin " + (Math.trunc(cpu * 1000)) + " cpu");
      }
    }
    endCpu = Game.cpu.getUsed();
    console.log('-----');
    console.log("Creeps took " + (endCpu - cellCpu));
    console.log("Total took " + (endCpu - startCpu));
    console.log(" Spawn: " + (cell.spawnEnergy()) + "/" + (cell.spawnEnergyCapacity()) + "\tTower: " + primaryTower.energy + "\tCreep: " + creepEnergy + "\tStore: " + primaryStorage.store.energy + "\tCPU Bucket: " + Game.cpu.bucket);
    return console.log('FIN');
  };
}

main();

//# sourceMappingURL=main.js.map
