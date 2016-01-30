var Agent, Config, Deliverator, shortName,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

Config = require('config');

shortName = function(target) {
  var parts;
  parts = (target.name || target.structureType || target.id || "").split("_");
  if (parts.length === 2) {
    return parts[0][0] + "_" + parts[1];
  }
  return parts.map(function(s) {
    return s.slice(0, 4);
  });
};

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
    target = Game.getObjectById((ref = this.creep.memory.sourceTarget) != null ? ref.id : void 0);
    if (!target) {
      target = this.sourceFn();
      if (target != null) {
        this.creep.say("-> " + (target.name || target.structureType || target.id));
      }
    }
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
        case target.transfer == null:
          return (function(_this) {
            return function() {
              return target.transfer(_this.creep, RESOURCE_ENERGY);
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
    if ((err = this.creep.memory.lastErr = harvestFunc()) === ERR_NOT_IN_RANGE) {
      if (this.creep.moveTo(target) === ERR_NO_PATH) {
        this.creep.memory.failCount++;
      }
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      delete this.creep.memory.sourceTarget;
    }
    if ((target != null ? target.carryCapacity : void 0) > 0 && (target != null ? (ref1 = target.carry) != null ? ref1.energy : void 0 : void 0) < 20) {
      delete this.creep.memory.sourceTarget;
    }
    if (this.creep.memory.failCount > 5) {
      delete this.creep.memory.sourceTarget;
      this.creep.memory.failCount = 0;
    }
    return true;
  };

  Deliverator.prototype.deliver = function() {
    var deliverFunc, err, ref, ref1, target;
    target = Game.getObjectById((ref = this.creep.memory.deliverTarget) != null ? ref.id : void 0);
    if (!target) {
      target || (target = this.targetFn());
      if (target != null) {
        this.creep.say("<- " + (shortName(target)));
      }
    }
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
    if ((err = this.creep.memory.lastErr = deliverFunc()) === ERR_NOT_IN_RANGE) {
      if (this.creep.moveTo(target) === ERR_NO_PATH) {
        this.creep.memory.failCount++;
      }
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      delete this.creep.memory.deliverTarget;
    }
    if (target.energyCapacity > 0 && (target != null ? target.energy : void 0) === (target != null ? target.energyCapacity : void 0)) {
      delete this.creep.memory.deliverTarget;
    }
    if ((target != null ? target.carryCapacity : void 0) > 0 && (target != null ? (ref1 = target.carry) != null ? ref1.energy : void 0 : void 0) >= ((target != null ? target.carryCapacity : void 0) - 10)) {
      delete this.creep.memory.deliverTarget;
    }
    if (this.creep.pos.isEqualTo(this.creep.memory.lastPos)) {
      this.creep.memory.failCount++;
    }
    this.creep.memory.lastPos = this.creep.pos;
    if (this.creep.memory.failCount > 5) {
      delete this.creep.memory.deliverTarget;
      this.creep.memory.failCount = 0;
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
        this.creep.memory.failCount = 0;
        break;
      case this.creep.carry.energy !== 0:
        this.setState('fill');
        this.creep.memory.failCount = 0;
    }
    return ret;
  };

  return Deliverator;

})(Agent);

module.exports = Deliverator;

//# sourceMappingURL=deliverator.js.map
