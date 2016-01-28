_ = require('lodash')

module.exports = function (creep) {

  if(creep.carry.energy < creep.carryCapacity) {
    var sources = creep.room.find(FIND_SOURCES);
    if(creep.harvest(sources[0]) == ERR_NOT_IN_RANGE) {
      creep.moveTo(sources[0]);
    }     
  }
  else {
      var spawn = Game.spawns.Spawn1
      var structures = Game.spawns.Spawn1.room.find(FIND_MY_STRUCTURES)
        
        
      if (spawn.energy < spawn.energyCapacity) {
        if(creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(spawn);
        } else {
            spawn.renewCreep(creep);
        }
      } else {
            var extensions = _.filter(structures, function(s) {
                return (s.structureType == 'extension' && s.energy < s.energyCapacity)
            })
            if (extensions.length > 0) {
                var extension = extensions[0];
            if(creep.transfer(extension, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(extension);
            }
            }
      }
  }
}