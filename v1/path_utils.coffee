class PathUtils

  constructor: (@creep) ->
    @pos = @creep
    @pos = @creep.pos if @creep.pos?
    @pos_S = "#{@pos.roomName}_#{@pos.x}_#{@pos.y}"

  sortByDistance: (targets) ->
    t=targets.sort(@distanceComparator)
    t

  distance: (target) ->
    @pos.getRangeTo(target)

  distanceComparator: (a,b) =>
    a.distances ?= {}
    a.distances[@pos_S] ?= @distance(a)
    b.distances ?= {}
    b.distances[@pos_S] ?= @distance(b)
    return a.distances[@pos_S] - b.distances[@pos_S]

  nearestEnergyNeed: (room=null) =>
    # TODO: Units can request energy via flag
    room ||= @creep.room
    targets = room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)
    #targets = targets.concat(room.find(FIND_MY_CREEPS).filter((c) -> (c.memory.energyRequester && c.carry.energy < c.carryCapacity)))
    @sortByDistance(targets)
    return targets[0]
    #return targets[parseInt(Math.random() * Math.min(targets.length,3))] unless targets.length == 0

  nearestEnergyProvider: (room=null) =>
    room ||= @creep.room
    targets = room.find(FIND_MY_CREEPS).filter((c) -> c.memory.energyProvider && c.carry.energy > 20)
    targets = targets.concat(room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy > 0))
    @sortByDistance(targets)
    return targets[0]
    #return targets[parseInt(Math.random() * Math.min(targets.length,3))] unless targets.length == 0

module.exports = PathUtils