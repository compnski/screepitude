Deliverator = require('deliverator')
PathUtils = require('path_utils')
class Upgrader extends Deliverator
  constructor: (creep) ->
    super(creep, (-> null), @roomController)
    creep.memory.state ||= 'deliver' # Start with deliver
    creep.memory.energyRequester = true
    if creep.carry.energy == 0
      Game.notify("#{creep.name} out of energy", 60)

  roomController: ->
    @creep.room.controller

  loop: ->
    super()



module.exports = Upgrader