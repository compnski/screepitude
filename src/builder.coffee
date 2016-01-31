PathUtils = require('path_utils')
Deliverator = require('deliverator')
Config = require('config')
class Builder extends Deliverator
  constructor: (creep, sourceFn=null) ->
    if Game.flags.BuildHere?
      @target = Game.flags.BuildHere
    else
      @target = creep
    
    unless sourceFn?
      @pathUtils ||= new PathUtils(@target)
      sourceFn = @pathUtils.nearestEnergyProvider
    super(creep, sourceFn, @constructionSite)
    creep.memory.energyRequester = true

  ramparts: (s) ->
    (s.structureType == 'rampart') && (s.hits < Math.min(Config.MaxWallHP, s.hitsMax))

  walls: (s) ->
    s.structureType == 'constructedWall' && s.hits < Math.min(s.hitsMax, (Config.MaxWallHP || 3000000))

  constructionSite: =>
    @pathUtils ||= new PathUtils(@target)
    sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_STRUCTURES).filter(@ramparts))
    #if sites.length == 0
      #sites = @pathUtils.sortByDistance(@creep.room.find(FIND_STRUCTURES).filter(@walls))
    sites[0]

module.exports = Builder