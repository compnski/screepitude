PathUtils = require('path_utils')
class Agent
  constructor: (creep) ->
    @creep = creep

  setState: (state) ->
    @creep.memory.state = state

  loop: ->
    if !@fullEnergy()
      sources = @creep.room.find(FIND_SOURCES)
      @harvestFromSource(sources[0])
    else
      @giveEnergyToSpawn(@nearestEnergyNeed())

  nearestEnergyNeed: ->
    targets = @creep.room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)
    new PathUtils(@creep).sortByDistance(targets)
    return targets[0] unless targets.length == 0
    @primarySpawn() # Backup target

  harvestFromSource: (source) ->
    if @creep.harvest(source) == ERR_NOT_IN_RANGE
      @creep.moveTo(source)

  primarySpawn: =>
    Game.spawns.Spawn1

  giveEnergyToSpawn: (spawn) ->
    if @creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
      @creep.moveTo(spawn)
    else 
      spawn.renewCreep(@creep) if spawn.renewCreep?

  fullEnergy: ->
    return @creep.carry.energy >= @creep.carryCapacity

module.exports = Agent