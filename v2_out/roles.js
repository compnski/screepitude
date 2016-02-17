var Config, Creeps, DIRECTIONS, Deliverator, PathUtils, Roles, TaskCounts, Tasks, Utils, creep, i, len, moveTo, name, name1, primaryRoom, primarySpawn, primaryStorage, primaryTower, ref, t, t1, wiggle;

PathUtils = require('path_utils');

Deliverator = require('deliverator');

Config = require('config');

Tasks = require('tasks');

Utils = require('utils');

t1 = Game.cpu.getUsed();

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

DIRECTIONS = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];

wiggle = function(creep) {
  creep.log('wiggle!');
  return creep.move(DIRECTIONS[parseInt(Math.random() * DIRECTIONS.length)]);
};

moveTo = function(creep, to, opts) {
  var err;
  if (opts == null) {
    opts = {};
  }
  if (creep.fatigue > 0) {
    return 0;
  }
  opts["maxOps"] = 1000;
  err = creep.moveTo(to, opts);
  if (err < 0) {
    creep.log(err);
  }
  if (err === -2) {
    opts["reusePath"] = 30;
    opts["maxOps"] = 3000;
    opts["ignoreCreeps"] = true;
    if (creep.moveTo(to, opts) === -2) {
      if (creep.pos.roomName !== to.pos.roomName) {
        creep.log("going to the next room", Game.map.findExit(creep.pos.roomName, to.pos.roomName));
        creep.log(JSON.stringify(to));
        creep.move(Game.map.findExit(creep.pos.roomName, to.pos.roomName));
      } else {
        creep.log("HELPPpppppppppppp");
      }
    }
  }
  return 0;
};

Roles = (function() {
  function Roles() {}

  Roles.Piler = function(creep) {
    return creep.memory.role = 'piler';
  };

  Roles.Upgrade = function(creep, targetFlag) {
    var _, ref1, s;
    ref1 = Game.spawns;
    for (_ in ref1) {
      s = ref1[_];
      if (targetFlag.pos.roomName === s.pos.roomName) {
        if (s.energy < 200) {
          Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), s);
          return;
        }
      }
    }
    return Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), targetFlag.room.controller);
  };

  Roles.Repair = function(creep, targetFlag) {
    var ref1, sourcePos, target;
    if ((Game.flags.RepairHere != null) && Game.flags.RepairHere.color !== 'red') {
      sourcePos = Game.flags.RepairHere.pos;
    } else {
      if ((Game.flags.BuildHere != null) && Game.flags.BuildHere.color === 'green') {
        if (Roles.Build(creep, targetFlag)) {
          return;
        }
      }
      sourcePos = creep.pos;
    }
    if (((ref1 = Game.flags.ClearTarget) != null ? ref1.color : void 0) !== 'red') {
      target = Game.getObjectById(creep.memory.repairTargetId);
    }
    if (target && target.hits === target.hitsMax) {
      target = null;
    }
    if (target == null) {
      target = sourcePos.findClosestByPath(FIND_STRUCTURES, {
        filter: function(s) {
          return Utils.needsRepair(s) && (Utils.ownedByMe(s) || s.structureType === STRUCTURE_WALL || s.structureType === s.ROAD);
        }
      });
    }
    if (target) {
      creep.memory.repairTargetId = target.id;
    }
    if (target && Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), target)) {
      return;
    }
    if (Roles.Build(creep, targetFlag)) {
      return;
    }
    if (Roles.Upgrade(creep, targetFlag)) {
      return;
    }
    return moveTo(creep, Game.flags.WP1);
  };

  Roles.Build = function(creep, targetFlag) {
    var ref1, sourcePos, target;
    if (targetFlag == null) {
      targetFlag = null;
    }
    targetFlag || (targetFlag = Game.flags.BuildHere);
    if ((targetFlag != null) && targetFlag.color !== 'red') {
      sourcePos = targetFlag;
    } else {
      sourcePos = creep;
    }
    if (sourcePos.pos.roomName !== creep.pos.roomName) {
      return Game.wp.move(creep, function() {
        return sourcePos;
      });
    }
    if (((ref1 = Game.flags.ClearTarget) != null ? ref1.color : void 0) !== 'red') {
      target = Game.getObjectById(creep.memory.buildTargetId);
    }
    if (target == null) {
      target = sourcePos.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
    }
    if (target) {
      creep.memory.buildTargetId = target.id;
    }
    if (target) {
      return Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), target);
    }
  };

  Roles.Deliver = function(creep, from, to) {
    new Deliverator(creep, from, to).loop();
    return true;
  };

  Roles.ClaimBot = function(creep, targetFlag) {
    var controller, err, ref1, ref2, ref3;
    if (((ref1 = targetFlag.room) != null ? (ref2 = ref1.controller) != null ? ref2.owner : void 0 : void 0) && targetFlag.room.controller.owner.username === creep.owner.username) {
      return this.FlagMiner(creep, targetFlag, targetFlag.room.controller);
    }
    if (targetFlag.pos.roomName !== creep.pos.roomName || !creep.pos.inRangeTo(targetFlag, 5)) {
      err = Game.wp.move(creep, function() {
        return targetFlag;
      });
      return;
    }
    if (creep.pos.inRangeTo(targetFlag, 2)) {
      if (!creep.memory.controllerId) {
        if (((ref3 = targetFlag.room) != null ? ref3.controller : void 0) != null) {
          creep.memory.controllerId = targetFlag.room.controller.id;
        }
      }
    } else {
      Game.wp.move(creep, function() {
        return targetFlag;
      });
      return;
    }
    if (creep.memory.controllerId) {
      controller = Game.getObjectById(creep.memory.controllerId);
    }
    if (!creep.pos.isNearTo(controller)) {
      return Game.wp.move(creep, function() {
        return controller;
      });
    } else {
      if (targetFlag.name.indexOf("Claim") > -1) {
        return creep.claimController(controller);
      } else {
        return creep.reserveController(controller);
      }
    }
  };

  Roles.FlagMiner = function(creep, targetFlag, targetDump) {
    var err, index, source, target;
    if (creep.carry.energy === creep.carryCapacity) {
      targetDump || (targetDump = primaryStorage);
      return Roles.Deliver(creep, null, targetDump);
    }
    index = creep.index();
    if (targetFlag == null) {
      targetFlag = Config.MineFlags[index % Config.MineFlags.length];
    }
    if (targetFlag.pos.roomName !== creep.pos.roomName || !creep.pos.inRangeTo(targetFlag, 5)) {
      err = Game.wp.move(creep, function() {
        return targetFlag;
      });
      if (err !== 0) {
        creep.log("flag miner error = " + err);
      }
      return;
    }
    if (creep.pos.inRangeTo(targetFlag, 2)) {
      if (!creep.memory.sourceId) {
        creep.memory.sourceId = new PathUtils(targetFlag).sortByDistance(targetFlag.room.find(FIND_SOURCES))[0].id;
      }
    } else {
      Game.wp.move(creep, function() {
        return targetFlag;
      });
      return;
    }
    if (creep.memory.sourceId) {
      source = Game.getObjectById(creep.memory.sourceId);
    }
    if (!creep.pos.isNearTo(source)) {
      Game.wp.move(creep, function() {
        return source;
      });
    }
    target = targetFlag.pos.findClosestByPath(FIND_DROPPED_ENERGY);
    if (creep.pickup(creep.pos.findClosestByPath(FIND_DROPPED_ENERGY)) === 0) {
      return;
    }
    err = creep.harvest(source);
    if ([-2, -7].indexOf(err) > -1) {
      return delete creep.memory.sourceId;
    }
  };

  Roles.MegaMiner = function(creep, targetFlag) {
    var err, source;
    if (!creep.pos.inRangeTo(targetFlag, 5)) {
      Game.wp.move(creep, function() {
        return targetFlag;
      });
      return;
    }
    if (!creep.memory.sourceId) {
      creep.memory.sourceId = targetFlag.pos.findClosestByPath(FIND_SOURCES).id;
    }
    if (creep.memory.sourceId) {
      source = Game.getObjectById(creep.memory.sourceId);
    }
    if (!creep.pos.isNearTo(source)) {
      Game.wp.move(creep, function() {
        return source;
      });
    }
    err = creep.harvest(source);
    if ([-2, -7].indexOf(err) > -1) {
      return delete creep.memory.sourceId;
    }
  };

  Roles.Invade = function(creep, targetFlag) {
    var err, findTargetCreep, target;
    if (targetFlag.pos.roomName !== creep.pos.roomName || !creep.pos.inRangeTo(targetFlag.pos, 5)) {
      err = moveTo(creep, targetFlag, {
        reusePath: 40,
        ignoreCreeps: true
      });
      if (err < 0) {
        creep.log("Move error", err);
      }
      return;
    }
    findTargetCreep = function(creep, pos) {
      var target;
      if (creep.canHeal()) {
        target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
          fitler: function(c) {
            return c.hits < c.hitsMax / 2;
          }
        });
        if (target == null) {
          target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
            fitler: function(c) {
              return c.hits < c.hitsMax;
            }
          });
        }
      }
      if (creep.canAttack() || creep.canShoot()) {
        target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
          fitler: function(c) {
            return c.canAttack() || c.canHeal() || c.canShoot();
          }
        });
        if (target == null) {
          target = creep.pos.findClosestByPath(FIND_HOSTILE_SPAWNS, {
            fitler: function(c) {
              return c.canAttack() || c.canHeal() || c.canShoot();
            }
          });
        }
        if (target == null) {
          target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES);
        }
        return target != null ? target : target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          fitler: function(c) {
            return c.structureType === STRUCTURE_WALL;
          }
        });
      }
    };
    target = findTargetCreep(creep, targetFlag.pos);
    if (!target) {
      return creep.moveTo(targetFlag);
    }
    if (creep.canShoot() && creep.pos.inRangeTo(target, 3)) {

    } else {
      creep.moveTo(target, {
        ignoreDestructibleStructures: true
      });
    }
    if (creep.canHeal() && Utils.isAlly(target)) {
      if (creep.pos.isNearTo(target.pos)) {
        creep.heal(target);
      } else {
        creep.rangedHeal(target);
      }
    }
    if (creep.canAttack() && Utils.isEnemy(target)) {
      if (creep.pos.isNearTo(target.pos)) {
        creep.attack(target);
      }
    }
    if (creep.canShoot() && Utils.isEnemy(target)) {
      return creep.rangedAttack(target);
    }
  };

  Roles.MineTransporter = function(creep, targetFlag, targetDump) {
    var target;
    if (targetDump == null) {
      targetDump = null;
    }
    if (creep.carry.energy === creep.carryCapacity) {
      targetDump || (targetDump = primaryStorage);
      return Roles.Deliver(creep, null, targetDump);
    }
    target = targetFlag.pos.findClosestByRange(FIND_DROPPED_ENERGY);
    if (!target) {
      return;
    }
    if (creep.pos.isNearTo(target)) {
      return creep.pickup(target);
    } else {
      return Game.wp.move(creep, function() {
        return target;
      });
    }
  };

  return Roles;

})();

module.exports = Roles;

//# sourceMappingURL=roles.js.map
