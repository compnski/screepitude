PathUtils = require('path_utils')
Deliverator = require('deliverator')
Config = require('config')
class Builder extends Deliverator
  constructor: (creep, sourceFn, rallyFlag=null) ->
    if rallyFlag?
      @target = rallyFlag
    else
      @target = creep
    super(creep, sourceFn, @constructionSite)
    creep.memory.energyRequester = true

  ramparts: (s) ->
    (s.structureType == 'rampart') && (s.hits < Math.min(Config.MaxWallHP, s.hitsMax))

  walls: (s) ->
    s.structureType == 'constructedWall' && s.hits < Math.min(s.hitsMax, (Config.MaxWallHP || 3000000))

  constructionSite: =>
    @pathUtils ||= new PathUtils(@target)
    sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    if sites.length == 0 && @creep.memory.role == 'far_builder'
      sites = []
      sites = sites.concat(Game.flags.Room2?.room?.find(FIND_MY_CONSTRUCTION_SITES))
      sites = sites.concat(Game.flags.Room3?.room?.find(FIND_MY_CONSTRUCTION_SITES))
      sites = @pathUtils.sortByDistance(sites)
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_STRUCTURES).filter(@ramparts))
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_STRUCTURES).filter(@walls))
    #if sites.length == 0
    #  sites = [@creep.room.controller] if @creep.room.controller.owner.username == "omgbear"
    sites[0]

module.exports = Builder