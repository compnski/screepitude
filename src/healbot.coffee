Agent = require('agent')
PathUtils = require('path_utils')
class Healbot extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_MY_CREEPS).filter((c)->c.hits < c.hitsMax))
    return targets[0]

  loop: (rally) ->
    target = @chooseTarget()
    rally ||= Game.flags.Flag1
    if !target? && !@creep.pos.inRangeTo(rally,3)
      @creep.moveTo(rally)
      return
    if ((err = @creep.heal(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target)

module.exports = Healbot