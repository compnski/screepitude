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
    var err, harvestFunc, moveErr, ref, target;
    target = Game.getObjectById((ref = this.creep.memory.sourceTarget) != null ? ref.id : void 0);
    if (!target) {
      target = this.sourceFn();
      if (target != null) {
        this.creep.say("-> " + (target.name || target.structureType || target.id));
      }
      if (target != null) {
        this.log("fill from " + (target.name || target.structureType || target.id || target.constructor));
      }
    }
    this.creep.memory.sourceTarget = target;
    if (target == null) {
      return false;
    }
    harvestFunc = (function() {
      switch (false) {
        case !(target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION):
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
    moveErr = -1;
    if ((err = this.creep.memory.lastErr = harvestFunc()) === ERR_NOT_IN_RANGE) {
      if ((moveErr = this.moveTo(target, {
        resusePath: 60
      })) === ERR_NO_PATH) {
        this.creep.memory.failCount++;
      }
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (moveErr === 0) {
      return;
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE && err !== ERR_NOT_ENOUGH_RESOURCES) {
      this.creep.memory.failCount++;
    }
    if (this.creep.memory.failCount > 10) {
      delete this.creep.memory.sourceTarget;
      this.creep.memory.failCount = 0;
      this.log('fill fail');
    }
    if (!this.creep.memory.sourceTarget && this.creep.carry.energy > 20) {
      this.creep.memory.state = 'deliver';
    }
    return true;
  };

  Deliverator.prototype.deliver = function() {
    var deliverFunc, err, moveErr, ref, target;
    target = Game.getObjectById((ref = this.creep.memory.deliverTarget) != null ? ref.id : void 0);
    if (!target) {
      target || (target = this.targetFn());
      if (target != null) {
        this.creep.say("<- " + (shortName(target)));
      }
      if (target != null) {
        this.log("deliver to " + (target.name || target.structureType || target.constructor) + " " + this.creep.memory.failCount);
      }
    }
    this.creep.memory.deliverTarget = target;
    if (target == null) {
      return false;
    }
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
        case !(target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_ROAD || target.structureType === STRUCTURE_RAMPART):
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
    moveErr = -1;
    if ((err = this.creep.memory.lastErr = deliverFunc()) === ERR_NOT_IN_RANGE) {
      if ((moveErr = this.moveTo(target, {
        resusePath: 50
      })) === ERR_NO_PATH) {
        this.creep.memory.failCount++;
      }
    } else if (target.renewCreep != null) {
      if (this.creep.ticksToLive < parseInt(Config.CreepRenewEnergy)) {
        target.renewCreep(this.creep);
      }
    }
    if (moveErr === 0) {
      return;
    }
    if (err === -8) {
      delete this.creep.memory.deliverTarget;
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      this.log(err);
      this.creep.memory.failCount++;
    }
    if (this.creep.memory.failCount > 10) {
      this.log('deliver fail');
      delete this.creep.memory.deliverTarget;
      this.creep.memory.failCount = 0;
    }
    if (this.creep.memory.role === 'repair' && target.hits >= Math.min(target.hitsMax, Config.MaxWallHP)) {
      delete this.creep.memory.deliverTarget;
      this.creep.memory.failCount = 0;
    }
    return true;
  };

  Deliverator.prototype.loop = function() {
    var e;
    try {
      return this.loopAction();
    } catch (_error) {
      e = _error;
      return this.log(e.stack);
    }
  };

  Deliverator.prototype.loopAction = function() {
    var ret;
    switch (this.creep.memory.state) {
      case 'fill':
        ret = this.fill();
        break;
      case 'deliver':
        ret = this.deliver();
        break;
      case 'renew':
        if (Game.spawns.Spawn1.renewCreep(this.creep) === ERR_NOT_IN_RANGE) {
          this.creep.moveTo(Game.spawns.Spawn1);
        }
        if (this.creep.ticksToLive > Math.min(Config.CreepRenewEnergy * 2, 1400) || Game.spawns.Spawn1.energy === 0) {
          this.setState('');
        }
    }
    switch (false) {
      case !(this.fullEnergy() && this.creep.memory.state !== 'renew'):
        if (this.creep.ticksToLive < Config.CreepRenewEnergy && this.creep.pos.inRangeTo(Game.spawns.Spawn1, 10)) {
          this.creep.say('renew');
          this.setState('renew');
          return ret;
        }
        this.setState('deliver');
        this.creep.memory.failCount = 0;
        break;
      case !(this.creep.carry.energy === 0 && this.creep.memory.state !== 'renew'):
        if (this.creep.ticksToLive < Config.CreepRenewEnergy && this.creep.pos.inRangeTo(Game.spawns.Spawn1, 10)) {
          this.creep.say('renew');
          this.setState('renew');
          return ret;
        }
        this.setState('fill');
        this.creep.memory.failCount = 0;
    }
    return ret;
  };

  return Deliverator;

})(Agent);

module.exports = Deliverator;

//# sourceMappingURL=deliverator.js.map
