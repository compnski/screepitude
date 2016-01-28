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
      @giveEnergyToSpawn(@primarySpawn())

  harvestFromSource: (source) ->
    if @creep.harvest(source) == ERR_NOT_IN_RANGE
      @creep.moveTo(source)

  primarySpawn: =>
    Game.spawns.Spawn1

  giveEnergyToSpawn: (spawn) ->
    if @creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
      @creep.moveTo(spawn)
    else 
      spawn.renewCreep(@creep)

  fullEnergy: ->
    return @creep.carry.energy >= @creep.carryCapacity

module.exports = Agent