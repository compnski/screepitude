var TransportSystem;

TransportSystem = (function() {
  function TransportSystem() {}

  TransportSystem.prototype.run = function() {
    var allocation, batchSize, creep, e, energy, j, jobs, k, l, len, len1, len2, name, pile, piler, pilers, piles, pos, ref, ref1, resource, resources, room, roomName, size, totalResources;
    console.log('Transport System');
    batchSize = 1000;
    piles = {};
    totalResources = 0;
    ref = Game.rooms;
    for (roomName in ref) {
      room = ref[roomName];
      resources = room.find(FIND_DROPPED_RESOURCES);
      for (j = 0, len = resources.length; j < len; j++) {
        resource = resources[j];
        pos = resource.pos;
        name = this.posStr(pos);
        energy = resource.energy;
        jobs = Math.floor(resource.energy / batchSize);
        if (jobs === 0 && resource.energy > 600) {
          jobs = 1;
        }
        if (jobs > 0) {
          piles[name] = jobs;
        }
        totalResources += resource.energy;
      }
    }
    console.log("Total energy: " + totalResources);
    console.log(JSON.stringify(piles));
    allocation = {};
    pilers = [];
    ref1 = Game.creeps;
    for (name in ref1) {
      creep = ref1[name];
      if (creep.memory.role === 'piler') {
        pilers.push(creep);
        pile = creep.memory.pile;
        if (pile != null) {
          allocation[pile] || (allocation[pile] = 0);
          allocation[pile] += 1;
        }
      }
    }
    console.log('allocation', JSON.stringify(allocation));
    for (k = 0, len1 = pilers.length; k < len1; k++) {
      piler = pilers[k];
      for (pile in piles) {
        size = piles[pile];
        if ((piler.memory.pile != null) || piler.memory.state === 'heal') {
          continue;
        }
        if ((allocation[pile] != null) && allocation[pile] >= size) {
          continue;
        }
        allocation[pile] || (allocation[pile] = 0);
        allocation[pile] += 1;
        piler.memory.pile = pile;
      }
    }
    for (l = 0, len2 = pilers.length; l < len2; l++) {
      piler = pilers[l];
      try {
        this.work(piler);
      } catch (_error) {
        e = _error;
        console.log(e.stack);
      }
    }
    return console.log("Num pilers: " + pilers.length);
  };

  TransportSystem.prototype.allocate = function(allocation, piler, pile) {
    allocation[pile] || (allocation[pile] = 0);
    allocation[pile] += 1;
    return piler.memory.pile = pile;
  };

  TransportSystem.prototype.workerStorage = function(worker) {
    var stores;
    stores = worker.room.find(FIND_DROPPED_RESOURCES).filter(function(s) {
      return s.amount > 50;
    });
    stores.push(this.storageInRoom(worker.room));
    return worker.pos.findClosestByPath(stores);
  };

  TransportSystem.prototype.nearestRefillable = function(worker) {
    var targets;
    targets = worker.room.find(FIND_MY_STRUCTURES).filter(function(c) {
      var good_energy, good_structure;
      good_structure = c.structureType === 'extension' || c.structureType === 'spawn' || c.structureType === 'tower';
      good_energy = c.energy < (c.energyCapacity - 20) && (c.structureType !== 'tower' || c.energy < 500);
      return good_structure && good_energy;
    });
    return worker.pos.findClosestByPath(targets);
  };

  TransportSystem.prototype.takeEnergy = function(worker, target) {
    if ((target.transferEnergy && target.transferEnergy(worker) || worker.harvest(target)) === ERR_NOT_IN_RANGE) {
      return Game.wp.move(worker, function() {
        return target;
      });
    }
  };

  TransportSystem.prototype.giveEnergy = function(worker, target) {
    var workerFunc;
    if ((target != null ? target.structureType : void 0) === 'controller') {
      workerFunc = function(t) {
        return worker.upgradeController(t);
      };
    } else {
      workerFunc = function(t) {
        return worker.transferEnergy(t);
      };
    }
    if (workerFunc(target) === ERR_NOT_IN_RANGE) {
      return Game.wp.move(worker, function() {
        return target;
      });
    }
  };

  TransportSystem.prototype.refill = function(piler) {
    var refillRoom;
    if (piler.carry.energy === 0 || (piler.memory.state == null)) {
      piler.memory.state = 'fill';
    }
    if (piler.carry.energy === piler.carryCapacity) {
      piler.memory.state = 'dump';
    }
    piler.say('refill+' + piler.memory.state);
    if (piler.memory.state === 'fill') {
      return this.takeEnergy(piler, this.workerStorage(piler));
    } else if (piler.memory.state === 'dump') {
      refillRoom = piler.memory.pile.split('-')[0];
      if (piler.room.name !== refillRoom) {
        Game.wp.move(piler, function() {
          return Game.rooms[refillRoom].controller;
        });
      }
      return this.giveEnergy(piler, this.nearestRefillable(piler));
    }
  };

  TransportSystem.prototype.work = function(piler) {
    var objs, pickupRes, pile, pileParts, renewRes, resource, roomName, roomPos, spawn, storage, x, y;
    if (!piler.ticksToLive) {
      return;
    }
    console.log(piler.name, "is working as piler on pile", piler.memory.pile || 'NULL        ', "in state", piler.memory.state, "w/ life", piler.ticksToLive, "with energy", piler.carry.energy);
    if ((piler.memory.pile || '').indexOf('-refill') !== -1) {
      this.refill(piler);
      return;
    }
    if (piler.memory.state !== 'heal' || piler.ticksToLive > 1000) {
      if (piler.memory.state === 'heal') {
        piler.memory.state = null;
      }
      if (piler.carry.energy === 0 || (piler.memory.state == null)) {
        piler.memory.state = 'fill';
      }
      if (piler.carry.energy === piler.carryCapacity) {
        piler.memory.state = 'dump';
        piler.memory.pile = null;
      }
      if (piler.ticksToLive < 200 && piler.carry.energy === 0) {
        piler.memory.state = 'heal';
      }
    }
    if (piler.memory.state === 'heal') {
      piler.say('heal');
      piler.memory.pile = null;
      if (piler.room.name === 'E11N9' || (Game.spawns.Spawn1.spawning != null)) {
        spawn = Game.spawns.Spawn2;
      } else {
        spawn = Game.spawns.Spawn1;
      }
      if (spawn != null) {
        renewRes = spawn.renewCreep(piler);
      }
      if (renewRes === ERR_NOT_IN_RANGE) {
        Game.wp.move(piler, function() {
          return spawn;
        });
      }
    }
    if (piler.memory.state === 'fill' && piler.memory.pile) {
      piler.say('filling');
      pile = piler.memory.pile;
      pileParts = pile.split(',');
      roomName = pileParts[0];
      x = parseInt(pileParts[1]);
      y = parseInt(pileParts[2]);
      roomPos = new RoomPosition(x, y, pileParts[0]);
      if (Game.rooms[roomName] == null) {
        piler.memory.pile = null;
        return;
      }
      objs = Game.rooms[roomName].lookAt(x, y);
      resource = objs.filter(function(o) {
        return o.type === 'resource';
      })[0];
      if (resource == null) {
        piler.memory.pile = null;
        return;
      }
      resource = resource.resource;
      pickupRes = piler.pickup(resource);
      if (pickupRes === ERR_NOT_IN_RANGE) {
        piler.log(resource);
        if (resource != null) {
          return Game.wp.move(piler, function() {
            return resource;
          });
        }
      }
    } else if (piler.memory.state === 'dump') {
      if (piler.room.name === 'E11N9') {
        storage = this.storageInRoom(piler.room);
      } else {
        storage = this.storageInRoom(Game.spawns.Spawn1.room);
      }
      if (piler.transferEnergy(storage) === ERR_NOT_IN_RANGE) {
        Game.wp.move(piler, function() {
          return storage;
        });
      }
      return piler.say('dumping');
    }
  };

  TransportSystem.prototype.posStr = function(pos) {
    return pos.roomName + "," + pos.x + "," + pos.y;
  };

  TransportSystem.prototype.storageInRoom = function(room) {
    var stores;
    stores = room.find(FIND_MY_STRUCTURES).filter(function(s) {
      return s.structureType === STRUCTURE_STORAGE;
    });
    if (stores.length === 0) {
      stores = room.find(FIND_MY_STRUCTURES).filter(function(s) {
        return s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION;
      });
    }
    if (stores.length === 0) {
      return null;
    }
    return stores[0];
  };

  TransportSystem.prototype.makeRole = function(partsMap) {
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

  return TransportSystem;

})();

module.exports = TransportSystem;

//# sourceMappingURL=transport_system.js.map
