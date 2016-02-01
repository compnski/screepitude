Agent = require('agent')
PathUtils = require('path_utils')
class Guard extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_HOSTILE_CREEPS))
    return targets[0]

  loop: ->
    target = @chooseTarget()
    rally = Game.flags.Flag1
    target = null if target? && rally.pos.getRangeTo(target) > 5
    if !target? && !@creep.pos.inRangeTo(rally,2)
      @creep.moveTo(rally)
      return
    if ((err = @creep.attack(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target)

module.exports = Guard