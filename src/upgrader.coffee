Deliverator = require('deliverator')
class Upgrader extends Deliverator
  constructor: (creep) ->
  	super(creep, @primarySpawn, @roomController)

  roomController: ->
   	@creep.room.controller

  loop: ->
  	super()



module.exports = Upgrader