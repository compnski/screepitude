Agent = require('agent')
class MegaMiner extends Agent

  @bodyParts: (room) ->
    #As many WORK modules as can fit in the available extensions
    spawnSpace = room.spawnEnergyCapacity()
    # TODO: Put a better max on workParts
    workParts = Math.min(Math.floor((spawnSpace - 100)/100),5) # move + carry
    [MOVE, CARRY].concat(WORK for i in [1..workParts])
  constructor: (creep, targetSource=nil) ->
    super(creep)
    creep.memory.energyProvider = true
    if targetSource?
      @targetSource = creep.memory.targetSource = targetSource
  loop: ->
    if @creep.pos == @creep.pos.findClosestByRange(FIND_DROPPED_ENERGY).pos 
      @creep.pickup(@creep.pos.findClosestByRange(FIND_DROPPED_ENERGY))
      return
    switch @creep.harvest(@targetSource)
      when ERR_NOT_IN_RANGE then @creep.moveTo(@targetSource)
      when ERR_NOT_ENOUGH_RESOURCES then @creep.pickup(@creep.pos.findClosestByRange(FIND_DROPPED_ENERGY))
      
    if @creep.carry.energy >= @creep.energyCapacity
      @creep.say("I'm Full!")
  hasEnergy: ->
    @creep.carry.energy > 0

module.exports = MegaMiner