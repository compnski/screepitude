class PathUtils

  constructor: (@creep) ->
    @pos = @creep.pos

  sortByDistance: (targets) ->
    targets.sort(@distanceComparator)

  distance: (target) ->
    @pos.getRangeTo(target)

  distanceComparator: (a,b) =>
    a.distances ?= {}
    a.distances[@creep.id] ?= @distance(a)
    b.distances ?= {}
    b.distances[@creep.id] ?= @distance(b)
    return a.distances[@creep.id] - b.distances[@creep.id]

  nearestEnergyNeed: (room=null) =>
    # TODO: Units can request energy via flag
    room ||= @creep.room
    targets = room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)
    targets = targets.concat(room.find(FIND_MY_CREEPS).filter((c) -> (c.memory.energyRequester && c.carry.energy < c.carryCapacity)))
    @sortByDistance(targets)
    return targets[parseInt(Math.random() * Math.min(targets.length,3))] unless targets.length == 0

  nearestEnergyProvider: (room=null) =>
    room ||= @creep.room
    targets = room.find(FIND_MY_CREEPS).filter((c) -> c.memory.energyProvider && c.carry.energy > 20)
    @sortByDistance(targets)
    return targets[parseInt(Math.random() * Math.min(targets.length,3))] unless targets.length == 0

module.exports = PathUtils