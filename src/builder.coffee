PathUtils = require('path_utils')
Deliverator = require('deliverator')
class Builder extends Deliverator
  constructor: (creep) ->
    super(creep, new PathUtils(creep).nearestEnergyProvider, @constructionSite)
    creep.memory.energyRequester = false

  constructionSite: =>
    sites = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    sites[0]

module.exports = Builder