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

  nearestEnergyNeed: (room=null) =>
    # TODO: Units can request energy via flag
    room ||= @creep.room
    targets = room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)
    targets = targets.concat(room.find(FIND_MY_CREEPS).filter((c) -> (c.memory.energyRequester && c.carry.energy < c.carryCapacity)))
    @sortByDistance(targets)
    return targets[0] unless targets.length == 0

  nearestEnergyProvider: (room=null) =>
    room ||= @creep.room
    targets = room.find(FIND_MY_CREEPS).filter((c) -> c.memory.energyProvider && c.carry.energy > 20)
    @sortByDistance(targets)
    return targets[0] unless targets.length == 0

module.exports = PathUtils