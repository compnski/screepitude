Deliverator = require('deliverator')
class Builder extends Deliverator
  constructor: (creep) ->
  	super(creep, @primarySpawn, @constructionSite)

  constructionSite: ->
   	sites = @creep.room.find(FIND_MY_CONSTRUCTION_SITES)
   	sites.forEach( (s) => s.distance = @creep.pos.getRangeTo(s))
   	sites.sort((a,b) -> a.distance - b.distance)
   	sites[0]


module.exports = Builder