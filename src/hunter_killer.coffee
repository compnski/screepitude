Agent = require('agent')
PathUtils = require('path_utils')
class HunterKiller extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_HOSTILE_CREEPS).concat(@creep.room.find(FIND_HOSTILE_SPAWNS)))
    #if targets.length == 0 
    #  targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_HOSTILE_STRUCTURES))
    target = targets[0]
    return unless target?
    console.log("#{@creep.name} closing in on #{target.name || target.structureType}: #{@creep.pos.getRangeTo(target)} units")
    return target

  loop: (rally, target) ->
    rally ||= Game.flags.Flag1
    target ||= @chooseTarget()
    if !target?
      @creep.moveTo(rally)
      return
    if ((err = @creep.attack(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target)

module.exports = HunterKiller