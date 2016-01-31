PathUtils = require('path_utils')
Agent = require('agent')
class PositionMiner extends Agent
  constructor: (creep, @miningPos) ->
    super(creep)

  loop: ->
    return if @fullEnergy()

    if !@creep.pos.inRangeTo(@miningPos, 1)
      @creep.moveTo(@miningPos)
    else
      sources = @creep.room.find(FIND_SOURCES)
      new PathUtils(@creep).sortByDistance(sources)
      source = sources[0]

      if @creep.harvest(source) == ERR_NOT_IN_RANGE
        @creep.moveTo(source)

module.exports = PositionMiner
