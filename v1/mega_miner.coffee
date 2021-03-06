Agent = require('agent')
class MegaMiner extends Agent

  @bodyParts: (room) ->
    #As many WORK modules as can fit in the available extensions
    spawnSpace = room.spawnEnergyCapacity()
    # TODO: Put a better max on workParts
    workParts = Math.min(Math.floor((spawnSpace - 200)/100),9) # Max at 9, 10 consumes it too fast
    [MOVE, MOVE, CARRY, CARRY].concat(WORK for i in [1..workParts])
  constructor: (creep, targetSource=nil) ->
    super(creep)
    creep.memory.energyProvider = true
    if targetSource?
      @targetSource = creep.memory.targetSource = targetSource
  loop: ->
    if @creep.pos.isNearTo(@creep.pos.findClosestByRange(FIND_DROPPED_ENERGY)?.pos)
      if @creep.pickup(@creep.pos.findClosestByRange(FIND_DROPPED_ENERGY)) == 0
        return
    switch @creep.harvest(@targetSource)
      when ERR_NOT_IN_RANGE then @creep.moveTo(@targetSource)
      when ERR_NOT_ENOUGH_RESOURCES then @creep.pickup(@creep.pos.findClosestByRange(FIND_DROPPED_ENERGY))
      
    if @creep.carry.energy >= @creep.energyCapacity
      @creep.say("I'm Full!")
  hasEnergy: ->
    @creep.carry.energy > 0

module.exports = MegaMiner