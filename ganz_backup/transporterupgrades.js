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
    
    if (creep.carry.energy <= 30) {
        creep.memory['state'] = 'collect'
    } else if (creep.carry.energy == creep.carryCapacity) {
        creep.memory['state'] = 'dump';
    }
    if (creep.memory['state'] == 'collect') {
      var target = null
      var maxEnergy= 0
      var miners = findRole('miner');
    for (var minerIndex in miners) {
        var miner = miners[minerIndex];
        if ( miner.carry.energy > maxEnergy ) {
            target = miner
            maxEnergy = miner.carry.energy;
        }
    }
    if (target != null && maxEnergy > 0) {
      if (target.transferEnergy(creep) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);       
      }
    }
    }
    if (creep.memory['state'] == 'dump') {
      var target = null
      var minEnergy = 99999
      var upgraders = findRole('upgrader');
    for (var upgraderIndex in upgraders) {
        var upgrader = upgraders[upgraderIndex];
        if ( upgrader.carry.energy < minEnergy ) {
            target = upgrader
            minEnergy = upgrader.carry.energy;
        }
    }
//      console.log('minenergy found:', minEnergy)
    if (target != null && minEnergy < 99999) {
      if (creep.transferEnergy(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target);       
      }
    }
    }
}