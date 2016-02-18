Agent = require('agent')
PathUtils = require('path_utils')
class HunterKiller extends Agent
  chooseTarget: (rally) ->
    targets = []
    targets = new PathUtils(rally).sortByDistance(@creep.room.find(FIND_HOSTILE_CREEPS).concat(@creep.room.find(FIND_HOSTILE_SPAWNS)))
    #if targets.length == 0# or @creep.pos.getRangeTo(target) > 3
    #  targets = new PathUtils(rally).sortByDistance(@creep.room.find(FIND_STRUCTURES).filter((s)->s.structureType == STRUCTURE_WALL) )
    target = targets[0]
    console.log target
    return unless target?
    console.log("#{@creep.name} closing in on #{target.name || target.structureType}: #{@creep.pos.getRangeTo(target)} units")
    return target

  loop: (rally, target) ->
    rally ||= Game.flags.Flag1
    target ||= @chooseTarget(rally)
    target = null if target? and rally.pos.getRangeTo(target) > 15
    if !target? && !@creep.pos.inRangeTo(rally,3)
      @creep.moveTo(rally, {ignoreDestructible: true})
      return
    if ((err = @creep.attack(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target, {ignoreDestructible: true})

module.exports = HunterKiller