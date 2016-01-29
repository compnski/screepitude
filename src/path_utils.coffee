class PathUtils

  constructor: (@creep) ->
    @pos = @creep.pos

  sortByDistance: (targets) ->
    targets.sort(@distanceComparator)

  distance: (target) ->
    @pos.getRangeTo(target)

  distanceComparator: (a,b) =>
    a.distance ?= @distance(a)
    b.distance ?= @distance(b)
    return a.distance - b.distance

  nearestEnergyNeed: ->
    # TODO: Units can request energy via flag
    targets = @creep.room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)
    @sortByDistance(targets)
    return targets[0] unless targets.length == 0

  nearestEnergyProvider: ->
    targets = @creep.room.find(FIND_MY_CREEPS).filter((c) -> c.memory.energyProvider && c.carry.energy > 10)
    @sortByDistance(targets)
    return targets[0] unless targets.length == 0

module.exports = PathUtils