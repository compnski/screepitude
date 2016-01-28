var PathUtils;

PathUtils = require('path_utils');

module.exports = function(creep) {
  var chooseTarget, err, target;
  chooseTarget = function() {
    var targets;
    targets = PathUtils.sortByDistance(creep, creep.room.find(FIND_HOSTILE_CREEPS));
    return targets[0];
  };
  target = chooseTarget(creep);
  if (target == null) {
    creep.moveTo(Game.flags.Flag1);
    return;
  }
  if ((err = creep.attack(target)) === ERR_NOT_IN_RANGE) {
    return creep.moveTo(target);
  }
};

//# sourceMappingURL=guard.js.map
