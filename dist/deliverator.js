var Agent, Config, Deliverator,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

Config = require('config');

Deliverator = (function(superClass) {
  extend(Deliverator, superClass);

  function Deliverator(creep, sourceFn, targetFn) {
    var base;
    this.sourceFn = sourceFn;
    this.targetFn = targetFn;
    Deliverator.__super__.constructor.call(this, creep);
    (base = this.creep.memory).state || (base.state = 'fill');
  }

  Deliverator.prototype.fill = function() {
    var err, harvestFunc, ref, ref1, target;
    delete this.creep.memory.sourceTarget;
    target = this.creep.memory.sourceTarget;
    target || (target = this.sourceFn());
    this.creep.memory.sourceTarget = target;
    if (target == null) {
      return false;
    }
    console.log(this.creep.name + " will fill from " + (target.name || target.structureType || target.id || target.constructor));
    harvestFunc = (function() {
      switch (false) {
        case target.structureType !== STRUCTURE_SPAWN:
          return (function(_this) {
            return function() {
              return target.transferEnergy(_this.creep);
            };
          })(this);
        case target.transferEnergy == null:
          return (function(_this) {
            return function() {
              return target.transferEnergy(_this.creep);
            };
          })(this);
        case target.constructor !== Source:
          return (function(_this) {
            return function() {
              return _this.creep.harvest(target);
            };
          })(this);
      }
    }).call(this);
    if ((err = harvestFunc()) === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(target);
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      delete this.creep.memory.sourceTarget;
    }
    if (((ref = this.creep.memory.sourceTarget) != null ? ref.energy : void 0) === ((ref1 = this.creep.memory.sourceTarget) != null ? ref1.energyCapacity : void 0)) {
      delete this.creep.memory.sourceTarget;
    }
    return true;
  };

  Deliverator.prototype.deliver = function() {
    var deliverFunc, err, target;
    target = this.creep.memory.deliverTarget;
    target || (target = this.targetFn());
    this.creep.memory.deliverTarget = target;
    if (target == null) {
      return false;
    }
    console.log(this.creep.name + " will deliver to " + (target.name || target.structureType || target.constructor));
    deliverFunc = (function() {
      switch (false) {
        case target.structureType !== STRUCTURE_CONTROLLER:
          return (function(_this) {
            return function() {
              return _this.creep.upgradeController(target);
            };
          })(this);
        case target.constructor !== ConstructionSite:
          return (function(_this) {
            return function() {
              return _this.creep.build(target);
            };
          })(this);
        case !(target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_ROAD):
          return (function(_this) {
            return function() {
              return _this.creep.repair(target);
            };
          })(this);
        default:
          return (function(_this) {
            return function() {
              return _this.creep.transfer(target, RESOURCE_ENERGY);
            };
          })(this);
      }
    }).call(this);
    if ((err = this.creep.memory.last_err = deliverFunc()) === ERR_NOT_IN_RANGE) {
      this.creep.moveTo(target);
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      delete this.creep.memory.deliverTarget;
    }
    return true;
  };

  Deliverator.prototype.loop = function() {
    var ret;
    switch (this.creep.memory.state) {
      case 'fill':
        ret = this.fill();
        break;
      case 'deliver':
        ret = this.deliver();
    }
    switch (false) {
      case !this.fullEnergy():
        this.setState('deliver');
        break;
      case this.creep.carry.energy !== 0:
        this.setState('fill');
    }
    return ret;
  };

  return Deliverator;

})(Agent);

module.exports = Deliverator;

//# sourceMappingURL=deliverator.js.map
