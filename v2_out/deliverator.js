var Agent, Config, Deliverator, Utils, shortName,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

Config = require('config');

Utils = require('utils');

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

  function Deliverator(creep, source, target1) {
    var base;
    this.source = source;
    this.target = target1;
    Deliverator.__super__.constructor.call(this, creep);
    (base = this.creep.memory).state || (base.state = 'fill');
  }

  Deliverator.prototype.fill = function() {
    var err, harvestFunc, moveErr, target;
    target = Game.getObjectById(this.creep.memory.sourceId);
    if (!target) {
      target = this.source;
      if (target != null) {
        this.creep.say("-> " + (target.name || target.structureType || target.id));
      }
      if ((target != null) && Config.ChattyDeliverator) {
        this.log("fill from " + (target.name || target.structureType || target.id || target.constructor));
      }
    }
    if (!target) {
      return false;
    }
    this.creep.memory.sourceId = target.id;
    harvestFunc = (function() {
      switch (false) {
        case !(target.structureType === STRUCTURE_SPAWN || target.structureType === STRUCTURE_EXTENSION || target.structure === STRUCTURE_STORAGE || target.structureType === STRUCTURE_TOWER):
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
        case !(target.constructor = Resource):
          return (function(_this) {
            return function() {
              return _this.creep.pickup(target);
            };
          })(this);
      }
    }).call(this);
    moveErr = -1;
    if ((err = harvestFunc()) === ERR_NOT_IN_RANGE) {
      if ((moveErr = this.moveTo(target, {
        resusePath: 60
      })) === ERR_NO_PATH) {
        this.creep.memory.failCount++;
      }
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE && err !== ERR_NOT_ENOUGH_RESOURCES) {
      this.creep.memory.failCount++;
      this.creep.log(err, target);
      delete this.creep.memory.sourceId;
    }
    if (this.creep.memory.failCount > 10) {
      delete this.creep.memory.sourceId;
      this.creep.memory.failCount = 0;
      this.log('fill fail');
    }
    if (!this.creep.memory.sourceId && this.creep.carry.energy > 20) {
      this.creep.memory.state = 'deliver';
    }
    return true;
  };

  Deliverator.prototype.stillValid = function(target) {
    return target && (target.energyCapacity > 0 && target.energy !== target.energyCapacity || (target.structureType !== STRUCTURE_EXTENSION || target.structureType !== STRUCTURE_SPAWN || target.structureType !== STRUCTURE_TOWER));
  };

  Deliverator.prototype.deliver = function() {
    var deliverFunc, err, moveErr, target;
    target = Game.getObjectById(this.creep.memory.deliverId);
    if (!target || !this.stillValid(target)) {
      target || (target = this.target);
      if (target != null) {
        this.creep.say("<- " + (shortName(target)));
      }
      if ((target != null) && Config.ChattyDeliverator) {
        this.log("deliver to " + (target.name || target.structureType || target.constructor) + " " + this.creep.memory.failCount);
      }
    }
    if (target == null) {
      return false;
    }
    this.creep.memory.deliverId = target.id;
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
        case !((target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_ROAD || target.structureType === STRUCTURE_RAMPART) || (this.creep.canRepair() && Utils.needsRepair(target))):
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
    if ((err = deliverFunc()) === ERR_NOT_IN_RANGE) {
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
      this.creep.memory.failCount = 0;
      delete this.creep.memory.deliverId;
      return;
    }
    if (err < 0 && err !== ERR_NOT_IN_RANGE) {
      this.creep.log(err);
      this.creep.memory.failCount++;
    }
    if (this.creep.memory.failCount > 10) {
      this.log('deliver fail');
      delete this.creep.memory.deliverId;
      this.creep.memory.failCount = 0;
    }
    if (this.creep.memory.role === 'repair' && target.hits >= Math.min(target.hitsMax, Config.MaxWallHP)) {
      delete this.creep.memory.deliverId;
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
    if ((Game.flags.ClearTarget != null) && Game.flags.ClearTarget.color === "white" && this.creep.pos.getRangeTo(Game.flags.ClearTarget) < 4) {
      delete this.creep.memory.deliverId;
      delete this.creep.memory.sourceId;
    }
    this.checkState();
    switch (this.creep.memory.state) {
      case 'fill':
        ret = this.fill();
        break;
      case 'deliver':
        ret = this.deliver();
        break;
      case 'renew':
        this.creep.say('Renew!');
        if (!this.creep.pos.isNearTo(Game.spawns.Spawn1)) {
          this.creep.moveTo(Game.spawns.Spawn1);
        } else {
          if (Game.spawns.Spawn1.renewCreep(this.creep) < 0) {
            this.setState('');
          }
        }
        if (this.creep.ticksToLive > Math.min(Config.CreepRenewEnergy * 2, 1400) || Game.spawns.Spawn1.energy === 0) {
          this.setState('fill');
        }
    }
    this.checkState();
    return ret;
  };

  Deliverator.prototype.checkState = function() {
    switch (false) {
      case !(this.creep.memory.state === 'renew' && Game.spawns.Spawn1.energy > 100):
        return 'nothing';
      case !this.fullEnergy():
        if (this.creep.ticksToLive < Config.CreepRenewEnergy && this.creep.pos.inRangeTo(Game.spawns.Spawn1, 5) && Game.spawns.Spawn1.energy > 100 && !Game.spawns.Spawn1.spawning) {
          this.creep.say('renew');
          this.setState('renew');
          return;
        }
        delete this.creep.memory.sourceId;
        this.setState('deliver');
        return this.creep.memory.failCount = 0;
      case this.creep.carry.energy !== 0:
        if (this.creep.ticksToLive < Config.CreepRenewEnergy && this.creep.pos.inRangeTo(Game.spawns.Spawn1, 5) && Game.spawns.Spawn1.energy > 100 && !Game.spawns.Spawn1.spawning) {
          this.creep.say('renew');
          this.setState('renew');
          return;
        }
        this.setState('fill');
        this.creep.memory.failCount = 0;
        return delete this.creep.memory.deliverId;
    }
  };

  return Deliverator;

})(Agent);

module.exports = Deliverator;

//# sourceMappingURL=deliverator.js.map
