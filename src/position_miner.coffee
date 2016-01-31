PathUtils = require('path_utils')
Agent = require('agent')
class PositionMiner extends Agent
  constructor: (creep, @miningPos) ->
    super(creep)
    creep.memory.energyProvider = true

  loop: ->
    return if @fullEnergy()

    if !@creep.pos.inRangeTo(@miningPos, 2)
      @log("Not in range #{JSON.stringify(@miningPos)}")
      @creep.moveTo(@miningPos)
    else
      sources = new PathUtils(@creep).sortByDistance(@creep.room.find(FIND_SOURCES))
      @log(sources.map(((s)->s.pos)))
      source = sources[0]
      if @creep.harvest(source) == ERR_NOT_IN_RANGE
        @log("Not in range to harvest #{JSON.stringify(source.pos)}")
        @creep.moveTo(source)

module.exports = PositionMiner
