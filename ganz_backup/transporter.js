_ = require('lodash')

module.exports = function (creep) {
    function findRole(role) {
        var creeps = [];
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory['role'] == role) {
                creeps.push(creep)
            }
        }
        return creeps;
    }
    
    if (creep.carry.energy == 0) {
        creep.memory['state'] = 'collect'
    } else if (creep.carry.energy == creep.carryCapacity) {
        creep.memory['state'] = 'dump';
    }
    if (creep.memory['state'] == 'collect') {
//      var target = null
//      var maxEnergy= 0
//      var miners = findRole('miner');
//    for (var minerIndex in miners) {
//        var miner = miners[minerIndex];
//        if ( miner.carry.energy > maxEnergy ) {
//            target = miner
//            maxEnergy = miner.carry.energy;
//        }
//    }
//    if (target != null && maxEnergy > 0) {
//      if (target.transferEnergy(creep) == ERR_NOT_IN_RANGE) {
//        creep.moveTo(target);       
//      }
//    }            
        var structures = Game.spawns.Spawn1.room.find(FIND_MY_STRUCTURES)
        var storages = _.filter(structures, function(s) {
            return (s.structureType == 'storage')
        })
        if (storages.length > 0) {
            var storage = storages[0];
        if(storage.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          creep.moveTo(storage);
        }
        } 
    }
    if (creep.memory['state'] == 'dump') {
        var spawn = Game.spawns.Spawn1
        if (spawn.energy < spawn.energyCapacity) {
            if (creep.transferEnergy(spawn) == ERR_NOT_IN_RANGE) {
          creep.moveTo(spawn);        
        } else {
            spawn.renewCreep(creep);
        }
        } else {
            // console.log('going to storage')
          var structures = Game.spawns.Spawn1.room.find(FIND_MY_STRUCTURES)
          
          var storages = _.filter(structures, function(s) {
                return (s.structureType == 'storage')
            })
            // console.log('storages.length', storages.length)
            if (storages.length > 0) {
                var storage = storages[0];
            if(creep.transfer(storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(storage);
            }
            }
        }
    }
}