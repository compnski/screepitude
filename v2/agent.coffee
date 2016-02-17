Config = require('config')

class Agent
  constructor: (creep) ->
    @creep = creep

  setState: (state) ->
    @creep.memory.state = state

  moveTo: (targetPos, opts={}) ->
    Game.wp.move(@creep, -> targetPos)
    # targetPos = targetPos.pos if targetPos.pos?
    # opts.maxOps ||= 1000
    # if targetPos.roomName != @creep.pos.roomName
    #   opts.reusePath ||= 10
    #   return @creep.moveTo(targetPos, opts)
    # else
    #   opts.reusePath ||= 20
    #   return @creep.moveTo(targetPos, opts)

  loop: ->
    if !@fullEnergy()
      sources = @creep.room.find(FIND_SOURCES)
      @harvestFromSource(sources[0])
    else
      @giveEnergyToSpawn(@nearestEnergyNeed())

  harvestFromSource: (source) ->
    if @creep.harvest(source) == ERR_NOT_IN_RANGE
      @creep.moveTo(source)

  primarySpawn: ->
    Game.spawns.Spawn1

  giveEnergyToSpawn: (spawn) ->
    if @creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE
      @creep.moveTo(spawn)
    else
      spawn.renewCreep(@creep) if spawn.renewCreep? and Config.RewnewCreeps

  fullEnergy: ->
    return @creep.carry.energy >= @creep.carryCapacity
  needsEnergy: -> false
  hasEnergy: -> false

  log: (msg) ->
    console.log("[#{@creep.name}] #{msg}")

module.exports = Agent