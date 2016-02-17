Agent = require('agent')
Config = require('config')
Utils = require('utils')

shortName = (target) ->
  parts = (target.name || target.structureType || target.id || "").split("_")
  if parts.length == 2
    return parts[0][0] + "_" + parts[1]
  parts.map((s)->s[0..3])

class Deliverator extends Agent
  constructor: (creep, @source, @target) ->
    super(creep)
    @creep.memory.state ||= 'fill'

  fill: ->
    # Fill from target structure, renew if structure is a spawn
    #delete @creep.memory.sourceTarget
    target = Game.getObjectById(@creep.memory.sourceId)
    if !target
      target = @source
      @creep.say("-> #{target.name || target.structureType || target.id}") if target?
      @log("fill from #{target.name || target.structureType || target.id || target.constructor}") if target? and Config.ChattyDeliverator
    return false unless target
    @creep.memory.sourceId = target.id

    # if !@creep.pos.isNearTo(target)
    #   @moveTo(target)
    #   return

    harvestFunc = switch
      when target.structureType == STRUCTURE_SPAWN || target.structureType == STRUCTURE_EXTENSION || target.structure == STRUCTURE_STORAGE || target.structureType == STRUCTURE_TOWER
        => target.transferEnergy(@creep)
      when target.transfer?
        => target.transfer(@creep, RESOURCE_ENERGY)
      when target.constructor == Source
        => @creep.harvest(target)
      when target.constructor = Resource
        => @creep.pickup(target)

    moveErr = -1
    if (err = harvestFunc()) == ERR_NOT_IN_RANGE
      if (moveErr = @moveTo(target,{resusePath:60})) == ERR_NO_PATH
        @creep.memory.failCount++
    if err < 0 && err != ERR_NOT_IN_RANGE && err != ERR_NOT_ENOUGH_RESOURCES
      @creep.memory.failCount++
      @creep.log err, target
      delete @creep.memory.sourceId

    #if target?.carryCapacity > 0 && target?.carry?.energy == 0
    #  @creep.memory.failCount++
    if @creep.memory.failCount > 10
      delete @creep.memory.sourceId
      @creep.memory.failCount = 0
      @log('fill fail')
    if !@creep.memory.sourceId && @creep.carry.energy > 20
      @creep.memory.state = 'deliver'
    true

  stillValid: (target) ->
    target && (target.energyCapacity > 0 && target.energy != target.energyCapacity || (target.structureType != STRUCTURE_EXTENSION || target.structureType != STRUCTURE_SPAWN || target.structureType != STRUCTURE_TOWER ))

  deliver: ->
    target = Game.getObjectById(@creep.memory.deliverId)
    if !target or !@stillValid(target)
      target ||= @target
      @creep.say("<- #{shortName(target)}") if target?
      @log("deliver to #{target.name || target.structureType || target.constructor} #{@creep.memory.failCount}") if target? and Config.ChattyDeliverator
    return false unless target?
    @creep.memory.deliverId = target.id
    # if !@creep.pos.isNearTo(target)
    #   err = @moveTo(target,{resusePath:10})
    #   if err < 0
    #     @creep.memory.failCount++

    deliverFunc = switch
      when target.structureType == STRUCTURE_CONTROLLER
         => @creep.upgradeController(target)
      when target.constructor == ConstructionSite
         => @creep.build(target)
      when (target.structureType == STRUCTURE_WALL || target.structureType == STRUCTURE_ROAD || target.structureType == STRUCTURE_RAMPART) || (@creep.canRepair() && Utils.needsRepair(target))
        => @creep.repair(target)
      else
         => @creep.transfer(target, RESOURCE_ENERGY)

    moveErr = -1
    if (err= deliverFunc()) == ERR_NOT_IN_RANGE
      if (moveErr = @moveTo(target, resusePath:50)) == ERR_NO_PATH
        @creep.memory.failCount++
    else if target.renewCreep?
      target.renewCreep(@creep) if @creep.ticksToLive < parseInt(Config.CreepRenewEnergy)
    if moveErr == 0
      return
    if err == -8
      @creep.memory.failCount = 0
      delete @creep.memory.deliverId
      return
    if err < 0 && err != ERR_NOT_IN_RANGE
      @creep.log(err)
      @creep.memory.failCount++
    #if @creep.pos.x == @creep.memory.lastPos?.x && @creep.pos.y == @creep.memory.lastPos?.y
    #  @creep.memory.failCount++
    #@creep.memory.lastPos = @creep.pos
    if @creep.memory.failCount > 10
      @log('deliver fail')
      delete @creep.memory.deliverId
      @creep.memory.failCount = 0
    if @creep.memory.role == 'repair' and target.hits >= Math.min(target.hitsMax, Config.MaxWallHP)
      delete @creep.memory.deliverId
      @creep.memory.failCount = 0

    true


  loop: -> 
    try
      @loopAction()
    catch e
      @log(e.stack)

  loopAction: ->
    if Game.flags.ClearTarget? and Game.flags.ClearTarget.color == "white" and @creep.pos.getRangeTo(Game.flags.ClearTarget) < 4
      delete @creep.memory.deliverId
      delete @creep.memory.sourceId
    @checkState()
    switch @creep.memory.state
      when 'fill' then ret = @fill()
      when 'deliver' then ret = @deliver()
      when 'renew'
        @creep.say('Renew!')
        # TODO: Find nearest spawn
        if !@creep.pos.isNearTo(Game.spawns.Spawn1)
          @creep.moveTo(Game.spawns.Spawn1)
        else
          if Game.spawns.Spawn1.renewCreep(@creep) < 0
            @setState('')
        if @creep.ticksToLive > Math.min(Config.CreepRenewEnergy * 2, 1400) || Game.spawns.Spawn1.energy == 0
          @setState('fill')
    @checkState()
    return ret

  checkState: ->
    switch
      when @creep.memory.state == 'renew' and Game.spawns.Spawn1.energy > 100 then 'nothing'
      when @fullEnergy()# && @creep.memory.state != 'renew'
        if @creep.ticksToLive < Config.CreepRenewEnergy && @creep.pos.inRangeTo(Game.spawns.Spawn1,5) && Game.spawns.Spawn1.energy > 100  && !Game.spawns.Spawn1.spawning
          @creep.say('renew')
          @setState('renew')
          return
        delete @creep.memory.sourceId
        @setState('deliver')
        @creep.memory.failCount = 0
      when @creep.carry.energy == 0#  && @creep.memory.state != 'renew'
        if @creep.ticksToLive < Config.CreepRenewEnergy && @creep.pos.inRangeTo(Game.spawns.Spawn1,5) && Game.spawns.Spawn1.energy > 100 && !Game.spawns.Spawn1.spawning
          @creep.say('renew')
          @setState('renew')
          return
        @setState('fill')
        @creep.memory.failCount = 0
        delete @creep.memory.deliverId

module.exports = Deliverator