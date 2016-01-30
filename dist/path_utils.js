var PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PathUtils = (function() {
  function PathUtils(creep) {
    this.creep = creep;
    this.nearestEnergyProvider = bind(this.nearestEnergyProvider, this);
    this.nearestEnergyNeed = bind(this.nearestEnergyNeed, this);
    this.distanceComparator = bind(this.distanceComparator, this);
    this.pos = this.creep.pos;
  }

  PathUtils.prototype.sortByDistance = function(targets) {
    return targets.sort(this.distanceComparator);
  };

  PathUtils.prototype.distance = function(target) {
    return this.pos.getRangeTo(target);
  };

  PathUtils.prototype.distanceComparator = function(a, b) {
    if (a.distance == null) {
      a.distance = this.distance(a);
    }
    if (b.distance == null) {
      b.distance = this.distance(b);
    }
    return a.distance - b.distance;
  };

  PathUtils.prototype.nearestEnergyNeed = function(room) {
    var targets;
    if (room == null) {
      room = null;
    }
    room || (room = this.creep.room);
    targets = room.find(FIND_MY_STRUCTURES).filter(function(c) {
      return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy < c.energyCapacity;
    });
    targets = targets.concat(room.find(FIND_MY_CREEPS).filter(function(c) {
      return c.memory.energyRequester && c.carry.energy < c.carryCapacity;
    }));
    this.sortByDistance(targets);
    if (targets.length !== 0) {
      return targets[0];
    }
  };

  PathUtils.prototype.nearestEnergyProvider = function(room) {
    var targets;
    if (room == null) {
      room = null;
    }
    room || (room = this.creep.room);
    targets = room.find(FIND_MY_CREEPS).filter(function(c) {
      return c.memory.energyProvider && c.carry.energy > 20;
    });
    this.sortByDistance(targets);
    if (targets.length !== 0) {
      return targets[0];
    }
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
