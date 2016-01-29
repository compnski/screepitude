Agent = require('agent')
PathUtils = require('path_utils')
class Guard extends Agent
  chooseTarget: ->
    targets = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_HOSTILE_CREEPS))
    return targets[0]

  loop: ->
    target = @chooseTarget()
    if !target?
      @creep.moveTo(Game.flags.Flag1)
      return
    if ((err = @creep.attack(target)) == ERR_NOT_IN_RANGE)
      @creep.moveTo(target)

module.exports = Guard