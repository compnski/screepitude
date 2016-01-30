Agent = require('agent')
Config = require('config')
class Deliverator extends Agent
  constructor: (creep, @sourceFn, @targetFn) ->
    super(creep)
    @creep.memory.state ||= 'fill'
  fill: ->
    # Fill from target structure, renew if structure is a spawn
    #delete @creep.memory.sourceTarget
    target = Game.getObjectById(@creep.memory.sourceTarget?.id)
    target ||= @sourceFn()
    @creep.memory.sourceTarget = target
    return false unless target?
    console.log("#{@creep.name} will fill from #{target.name || target.structureType || target.id || target.constructor}")
    harvestFunc = switch
      when target.structureType == STRUCTURE_SPAWN
        => target.transferEnergy(@creep)
      when target.transfer?
        => target.transfer(@creep, RESOURCE_ENERGY)
      when target.constructor == Source
        => @creep.harvest(target)

    if (err = @creep.memory.lastErr = harvestFunc()) == ERR_NOT_IN_RANGE
      if @creep.moveTo(target) == ERR_NO_PATH
        @creep.memory.failCount++
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if err < 0 && err != ERR_NOT_IN_RANGE
      delete @creep.memory.sourceTarget
    if target?.carryCapacity > 0 && target?.carry?.energy < 20
      delete @creep.memory.sourceTarget
    if @creep.memory.failCount > 5
      delete @creep.memory.sourceTarget
      @creep.memory.failCount = 0
    true

  deliver: ->
    target = Game.getObjectById(@creep.memory.deliverTarget?.id)
    target ||= @targetFn()
    @creep.memory.deliverTarget = target
    return false unless target?
    console.log("#{@creep.name} will deliver to #{target.name || target.structureType || target.constructor}")
    deliverFunc = switch
      when target.structureType == STRUCTURE_CONTROLLER
         => @creep.upgradeController(target)
      when target.constructor == ConstructionSite
         => @creep.build(target)
      when target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_ROAD
        => @creep.repair(target)
      else
         => @creep.transfer(target, RESOURCE_ENERGY)

    if (err = @creep.memory.lastErr = deliverFunc()) == ERR_NOT_IN_RANGE
      if @creep.moveTo(target) == ERR_NO_PATH
        @creep.memory.failCount++
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if err < 0 && err != ERR_NOT_IN_RANGE
      delete @creep.memory.deliverTarget
    if target.energyCapacity > 0 && target?.energy == target?.energyCapacity
      delete @creep.memory.deliverTarget
    if target?.carryCapacity > 0 && target?.carry?.energy >= (target?.carryCapacity - 10)
      delete @creep.memory.deliverTarget
      
    if @creep.memory.failCount > 5
      delete @creep.memory.deliverTarget
      @creep.memory.failCount = 0


    true

  loop: ->
    switch @creep.memory.state
      when 'fill' then ret = @fill()
      when 'deliver' then ret = @deliver()
    switch
      when @fullEnergy()
        @setState('deliver')
        @creep.memory.failCount = 0
      when @creep.carry.energy == 0
        @setState('fill')
        @creep.memory.failCount = 0
    return ret

module.exports = Deliverator