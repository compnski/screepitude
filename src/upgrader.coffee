Deliverator = require('deliverator')
PathUtils = require('path_utils')
class Upgrader extends Deliverator
  constructor: (creep) ->
    super(creep, (-> null), @roomController)
    creep.memory.energyRequester = true

  roomController: ->
    @creep.room.controller

  loop: ->
    super()



module.exports = Upgrader