Agent = require('agent')
PathUtils = require('path_utils')
class HunterKiller extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_HOSTILE_CREEPS).concat(@creep.room.find(FIND_HOSTILE_SPAWNS)))
    return targets[0]

  loop: (rally, target) ->
    rally ||= Game.flags.Flag1
    target ||= @chooseTarget()
    if !target?
      @creep.moveTo(rally)
      return
    if ((err = @creep.attack(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target)

module.exports = HunterKiller