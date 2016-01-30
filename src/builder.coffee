PathUtils = require('path_utils')
Deliverator = require('deliverator')
class Builder extends Deliverator
  constructor: (creep) ->
    super(creep, @primarySpawn, @constructionSite)
    creep.memory.energyRequester = true

  constructionSite: =>
    sites = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    sites[0]

module.exports = Builder