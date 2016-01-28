Agent = require('agent')
class Deliverator extends Agent
  constructor: (creep, @sourceFn, @targetFn) ->
    super(creep)
    @creep.memory.state ||= 'fill'
  fillFrom: (target) ->
  	# Fill from target structure, renew if structure is a spawn
    harvestFunc = switch
      when target.structureType == STRUCTURE_SPAWN
        => target.transferEnergy(@creep)
      when target.constructor == Source
        => @creep.harvest(target)

    if harvestFunc() == ERR_NOT_IN_RANGE
      @creep.moveTo(target)
    else if target.structureType == STRUCTURE_SPAWN
      target.renewCreep(@creep)

  deliverTo: (target) ->
    deliverFunc = switch
     	when target.structureType == STRUCTURE_CONTROLLER
     		 => @creep.upgradeController(target)
   	  when target.constructor == ConstructionSite
         => @creep.build(target)
      when target.structurType == Wall || target.structureType == Road
        => @creep.repair(target)
      else
     		 => @creep.transfer(target, RESOURCE_ENERGY)

   	if deliverFunc() == ERR_NOT_IN_RANGE
   		@creep.moveTo(target)
    else if target.structureType == STRUCTURE_SPAWN
      target.renewCreep(@creep)

  loop: () ->
  	switch @creep.memory.state
  		when 'fill' then @fillFrom(@sourceFn())
  		when 'deliver' then @deliverTo(@targetFn())

  	switch
  		when @fullEnergy()
  			@setState('deliver')
  		when @creep.carry.energy == 0
  			@setState('fill')

module.exports = Deliverator