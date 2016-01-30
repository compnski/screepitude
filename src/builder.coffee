PathUtils = require('path_utils')
Deliverator = require('deliverator')
Config = require('config')
class Builder extends Deliverator
  constructor: (creep) ->
    @pathUtils = new PathUtils(creep)
    super(creep, @pathUtils.nearestEnergyProvider, @constructionSite)
    creep.memory.energyRequester = true

  rampartsAndTowers: (s) ->
    (s.structureType == 'rampart' || s.structureType == 'tower') && s.hits < s.hitsMax

  walls: (s) ->
    s.structureType == 'constructedWall' && s.hits < Math.min(s.hitsMax, (Config.MaxWallHP || 3000000))

  constructionSite: =>
    sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_STRUCTURES).filter(@rampartsAndTowers))
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_STRUCTURES).filter(@walls))
    console.log sites
    sites[0]

module.exports = Builder