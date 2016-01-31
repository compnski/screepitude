Agent = require('agent')
Config = require('config')

shortName = (target) ->
  parts = (target.name || target.structureType || target.id || "").split("_")
  if parts.length == 2
    return parts[0][0] + "_" + parts[1]
  parts.map((s)->s[0..3])

class Deliverator extends Agent
  constructor: (creep, @sourceFn, @targetFn) ->
    super(creep)
    @creep.memory.state ||= 'fill'
  fill: ->
    # Fill from target structure, renew if structure is a spawn
    #delete @creep.memory.sourceTarget
    target = Game.getObjectById(@creep.memory.sourceTarget?.id)
    if !target
      target = @sourceFn()
      @creep.say("-> #{target.name || target.structureType || target.id}") if target?
      @log("fill from #{target.name || target.structureType || target.id || target.constructor}") if target?
    @creep.memory.sourceTarget = target
    return false unless target?
    harvestFunc = switch
      when target.structureType == STRUCTURE_SPAWN || target.structureType == STRUCTURE_EXTENSION
        => target.transferEnergy(@creep)
      when target.transfer?
        => target.transfer(@creep, RESOURCE_ENERGY)
      when target.constructor == Source
        => @creep.harvest(target)

    moveErr = -1
    if (err = @creep.memory.lastErr = harvestFunc()) == ERR_NOT_IN_RANGE
      if (moveErr = @creep.moveTo(target,{resusePath:60})) == ERR_NO_PATH
        @creep.memory.failCount++
        @log("Repath")
        @creep.moveTo(target,{resusePath:0})
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if moveErr == 0
      return
    if err < 0 && err != ERR_NOT_IN_RANGE && err != ERR_NOT_ENOUGH_RESOURCES
      @creep.memory.failCount++
    #if target?.carryCapacity > 0 && target?.carry?.energy == 0
    #  @creep.memory.failCount++
    if @creep.memory.failCount > 10
      delete @creep.memory.sourceTarget
      @creep.memory.failCount = 0
      @log('fill fail')
    if !@creep.memory.sourceTarget && @creep.carry.energy > 20
      @creep.memory.state = 'deliver'
    true

  deliver: ->
    target = Game.getObjectById(@creep.memory.deliverTarget?.id)
    if !target
      target ||= @targetFn()
      @creep.say("<- #{shortName(target)}") if target?
      @log("deliver to #{target.name || target.structureType || target.constructor} #{@creep.memory.failCount}") if target?
    @creep.memory.deliverTarget = target
    return false unless target?
    deliverFunc = switch
      when target.structureType == STRUCTURE_CONTROLLER
         => @creep.upgradeController(target)
      when target.constructor == ConstructionSite
         => @creep.build(target)
      when target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_ROAD || target.structureType == STRUCTURE_RAMPART
        => @creep.repair(target)
      else
         => @creep.transfer(target, RESOURCE_ENERGY)

    moveErr = -1
    if (err = @creep.memory.lastErr = deliverFunc()) == ERR_NOT_IN_RANGE
      if (moveErr = @creep.moveTo(target, resusePath:50)) == ERR_NO_PATH
        @creep.memory.failCount++
        @creep.moveTo(target,{resusePath:0})
        @log("Repath!")
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if moveErr == 0
      return
    if err == -8
      delete @creep.memory.deliverTarget
    if err < 0 && err != ERR_NOT_IN_RANGE
      @log(err)
      @creep.memory.failCount++
    #if @creep.pos.x == @creep.memory.lastPos?.x && @creep.pos.y == @creep.memory.lastPos?.y
    #  @creep.memory.failCount++
    #@creep.memory.lastPos = @creep.pos

    if @creep.memory.failCount > 10
      @log('deliver fail')
      delete @creep.memory.deliverTarget
      @creep.memory.failCount = 0
    if @creep.memory.role == 'repair' and target.hits >= Math.min(target.hitsMax, Config.MaxWallHP)
      delete @creep.memory.deliverTarget
      @creep.memory.failCount = 0

    true


  loop: -> 
    try
      @loopAction()
    catch e
      @log(e.stack)

  loopAction: ->
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