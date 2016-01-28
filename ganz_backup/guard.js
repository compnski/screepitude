module.exports = function (creep) {
    chooseTarget = function(creep) {
        targets = creep.room.find(FIND_HOSTILE_CREEPS)
        targets.forEach(function(s){s.distance = creep.pos.getRangeTo(s.pos)})
        targets.sort(function(a,b){return a.distance - b.distance})
        return targets[0]
    };
    var err,err2
    var target = chooseTarget(creep)
    console.log('target... ', target)
    if(target == null) {
        console.log('... go to flag')
        creep.moveTo(Game.flags.Flag1)
        return
    }
    if ((err = creep.attack(target)) == ERR_NOT_IN_RANGE) {
       console.log('go to target')
       creep.moveTo(target)
    }
}