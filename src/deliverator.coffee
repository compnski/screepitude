Agent = require('agent')
class Deliverator extends Agent
  constructor: (creep, @sourceFn, @targetFn) ->
    super(creep)
    @creep.memory.state ||= 'fill'
  fillFrom: (target) ->
  	# Fill from target structure, renew if structure is a spawn
    if target.transferEnergy(@creep) == ERR_NOT_IN_RANGE
      @creep.moveTo(target)
    else if target.structureType == STRUCTURE_SPAWN
      target.renewCreep(@creep)

  deliverTo: (target) ->
   	if target.structureType == STRUCTURE_CONTROLLER
   		deliverFunc = => @creep.upgradeController(target)
   	else
   		deliverFunc = => @creep.transfer(target, RESOURCE_ENERGY)
   	if deliverFunc() == ERR_NOT_IN_RANGE
   		@creep.moveTo(target)

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