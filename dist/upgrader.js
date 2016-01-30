var Deliverator, PathUtils, Upgrader,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Deliverator = require('deliverator');

PathUtils = require('path_utils');

Upgrader = (function(superClass) {
  extend(Upgrader, superClass);

  function Upgrader(creep) {
    Upgrader.__super__.constructor.call(this, creep, (function() {
      return null;
    }), this.roomController);
    creep.memory.energyRequester = true;
  }

  Upgrader.prototype.roomController = function() {
    return this.creep.room.controller;
  };

  Upgrader.prototype.loop = function() {
    return Upgrader.__super__.loop.call(this);
  };

  return Upgrader;

})(Deliverator);

module.exports = Upgrader;

//# sourceMappingURL=upgrader.js.map
