PathUtils = require('path_utils')
Config = require('config')
class Agent
  constructor: (creep) ->
    @creep = creep

  setState: (state) ->
    @creep.memory.state = state

  moveTo: (targetPos, ignoreCreeps=true) ->
    targetPos = targetPos.pos if targetPos.pos?
    ignoreCreeps = false#@creep.name.indexOf("position_miner") != -1
    if targetPos.roomName != @creep.pos.roomName
      return @creep.moveTo(Game.roomNameToPos[targetPos.roomName], {reusePath: 30, ignoreCreeps: ignoreCreeps, maxOps: 1000})
    else
      return @creep.moveTo(targetPos, {resusePath: 20, ignoreCreeps: ignoreCreeps, maxOps: 1000})

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
