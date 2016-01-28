var utils = require('utils')
 
var MiningBase = function(name, resource, slots) {
    this.name = name
    this.resource = resource
    this.slots = slots
    // console.log('declared mining base', this.name, this.resource, this.slots)
}

MiningBase.prototype.miners = function() {
    return utils.findCreeps({role:'miner', miningBase: this.name})
}

MiningBase.prototype.recruitMiners = function() {
    var employmentDelta = this.slots - this.miners().length
    var unemployedMiners = utils.findCreeps({role:'miner', miningBase: null});
    // console.log('employment delta', employmentDelta)
    // console.log('unemployedMiners', unemployedMiners.length)
    
    for (var i = 0; i < employmentDelta; i++) {
        var newRecruit = unemployedMiners.shift()
        if (newRecruit == null) {
            break
        }
        newRecruit.memory['miningBase'] = this.name
        // console.log('Mining base', this.name, 'recruited', newRecruit)
    }
}

MiningBase.prototype.mine = function() {
    // console.log('mining')
    var miners = this.miners();
    for (var minerIndex in miners) {
        var miner = miners[minerIndex];
        if (miner.carry.energy == miner.carryCapacity) {
            continue;
        }
        if (miner.harvest(this.resource) == ERR_NOT_IN_RANGE) {
        miner.moveTo(this.resource);
      }
    }
}
 
module.exports = {
    MiningBase: MiningBase
}