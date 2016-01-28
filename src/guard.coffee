PathUtils = require('path_utils')
module.exports = (creep) ->

  chooseTarget = ->
    targets = PathUtils.sortByDistance(creep, creep.room.find(FIND_HOSTILE_CREEPS))
    return targets[0]

  target = chooseTarget(creep)
  if !target?
    creep.moveTo(Game.flags.Flag1)
    return
  if ((err = creep.attack(target)) == ERR_NOT_IN_RANGE)
    creep.moveTo(target)
