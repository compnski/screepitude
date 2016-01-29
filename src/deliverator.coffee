Agent = require('agent')
Config = require('config')
class Deliverator extends Agent
  constructor: (creep, @sourceFn, @targetFn) ->
    super(creep)
    @creep.memory.state ||= 'fill'
  fill: ->
    # Fill from target structure, renew if structure is a spawn
    delete @creep.memory.sourceTarget
    target = @creep.memory.sourceTarget
    target ||= @sourceFn()
    @creep.memory.sourceTarget = target
    return false unless target?
    console.log("#{@creep.name} will fill from #{target.name || target.structureType || target.id || target.constructor}")
    harvestFunc = switch
      when target.structureType == STRUCTURE_SPAWN
        => target.transferEnergy(@creep)
      when target.transferEnergy?
        => target.transferEnergy(@creep)
      when target.constructor == Source
        => @creep.harvest(target)

    if (err = harvestFunc()) == ERR_NOT_IN_RANGE
      @creep.moveTo(target)
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if err < 0 && err != ERR_NOT_IN_RANGE
      delete @creep.memory.sourceTarget
    if @creep.memory.sourceTarget?.energy == @creep.memory.sourceTarget?.energyCapacity
      delete @creep.memory.sourceTarget
    true

  deliver: ->
    target = @creep.memory.deliverTarget
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

    if (err = @creep.memory.last_err = deliverFunc()) == ERR_NOT_IN_RANGE
      @creep.moveTo(target)
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if err < 0 && err != ERR_NOT_IN_RANGE
      delete @creep.memory.deliverTarget
    true

  loop: ->
    switch @creep.memory.state
      when 'fill' then ret = @fill()
      when 'deliver' then ret = @deliver()
    switch
      when @fullEnergy()
        @setState('deliver')
      when @creep.carry.energy == 0
        @setState('fill')
    return ret

module.exports = Deliverator