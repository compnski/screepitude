Agent = require('agent')
PathUtils = require('path_utils')
class Healbot extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_MY_CREEPS).filter((c)->c.hits < c.hitsMax))
    return targets[0]

  loop: (rally) ->
    target = @chooseTarget()
    rally ||= Game.flags.Flag1
    if !target? #&& !@creep.pos.inRangeTo(rally,3)
      @moveTo(rally)
      return
    if @target
      @moveTo(@target)
      if @creep.pos.isNearTo(target)
        @creep.heal(target)
      else
        @creep.rangedHeal(target)

module.exports = Healbot