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
    var base, base1, name, name1;
    if (a.distances == null) {
      a.distances = {};
    }
    if ((base = a.distances)[name = this.creep.id] == null) {
      base[name] = this.distance(a);
    }
    if (b.distances == null) {
      b.distances = {};
    }
    if ((base1 = b.distances)[name1 = this.creep.id] == null) {
      base1[name1] = this.distance(b);
    }
    return a.distances[this.creep.id] - b.distances[this.creep.id];
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
      return targets[parseInt(Math.random() * Math.min(targets.length, 3))];
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
      return targets[parseInt(Math.random() * Math.min(targets.length, 3))];
    }
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
