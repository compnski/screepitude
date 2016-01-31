var PathUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PathUtils = (function() {
  function PathUtils(creep) {
    this.creep = creep;
    this.nearestEnergyProvider = bind(this.nearestEnergyProvider, this);
    this.nearestEnergyNeed = bind(this.nearestEnergyNeed, this);
    this.distanceComparator = bind(this.distanceComparator, this);
    this.pos = this.creep;
    if (this.creep.pos != null) {
      this.pos = this.creep.pos;
    }
    this.pos_S = this.pos.roomName + "_" + this.pos.x + "_" + this.pos.y;
  }

  PathUtils.prototype.sortByDistance = function(targets) {
    var t;
    t = targets.sort(this.distanceComparator);
    return t;
  };

  PathUtils.prototype.distance = function(target) {
    return this.pos.getRangeTo(target);
  };

  PathUtils.prototype.distanceComparator = function(a, b) {
    var base, base1, name, name1;
    if (a.distances == null) {
      a.distances = {};
    }
    if ((base = a.distances)[name = this.pos_S] == null) {
      base[name] = this.distance(a);
    }
    if (b.distances == null) {
      b.distances = {};
    }
    if ((base1 = b.distances)[name1 = this.pos_S] == null) {
      base1[name1] = this.distance(b);
    }
    return a.distances[this.pos_S] - b.distances[this.pos_S];
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
    this.sortByDistance(targets);
    return targets[0];
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
    targets = targets.concat(room.find(FIND_MY_STRUCTURES).filter(function(c) {
      return (c.structureType === 'extension' || c.structureType === 'spawn') && c.energy > 0;
    }));
    this.sortByDistance(targets);
    return targets[0];
  };

  return PathUtils;

})();

module.exports = PathUtils;

//# sourceMappingURL=path_utils.js.map
