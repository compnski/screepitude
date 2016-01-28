var Agent, Deliverator,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Agent = require('agent');

Deliverator = (function(superClass) {
  extend(Deliverator, superClass);

  function Deliverator(creep, sourceFn, targetFn) {
    var base;
    this.sourceFn = sourceFn;
    this.targetFn = targetFn;
    Deliverator.__super__.constructor.call(this, creep);
    (base = this.creep.memory).state || (base.state = 'fill');
  }

  Deliverator.prototype.fillFrom = function(target) {
    if (target.transferEnergy(this.creep) === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target);
    } else if (target.structureType === STRUCTURE_SPAWN) {
      return target.renewCreep(this.creep);
    }
  };

  Deliverator.prototype.deliverTo = function(target) {
    var deliverFunc;
    if (target.structureType === STRUCTURE_CONTROLLER) {
      deliverFunc = (function(_this) {
        return function() {
          return _this.creep.upgradeController(target);
        };
      })(this);
    } else {
      deliverFunc = (function(_this) {
        return function() {
          return _this.creep.transfer(target, RESOURCE_ENERGY);
        };
      })(this);
    }
    if (deliverFunc() === ERR_NOT_IN_RANGE) {
      return this.creep.moveTo(target);
    }
  };

  Deliverator.prototype.loop = function() {
    switch (this.creep.memory.state) {
      case 'fill':
        this.fillFrom(this.sourceFn());
        break;
      case 'deliver':
        this.deliverTo(this.targetFn());
    }
    switch (false) {
      case !this.fullEnergy():
        return this.setState('deliver');
      case this.creep.carry.energy !== 0:
        return this.setState('fill');
    }
  };

  return Deliverator;

})(Agent);

module.exports = Deliverator;

//# sourceMappingURL=deliverator.js.map
