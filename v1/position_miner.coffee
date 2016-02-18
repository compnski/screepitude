PathUtils = require('path_utils')
Agent = require('agent')
class PositionMiner extends Agent
  constructor: (creep, @miningPos) ->
    super(creep)
    creep.memory.energyProvider = true

  loop: ->
    return if @fullEnergy()

    if !@creep.memory.sourceId
      if @miningPos.roomName == @creep.pos.roomName
        @creep.memory.sourceId = new PathUtils(@miningPos).sortByDistance(@creep.room.find(FIND_SOURCES))[0].id
        @log("Found source #{@creep.memory.sourceId}")
      else
        @log("Moving toward #{@miningPos}")
        @creep.moveTo(@miningPos, reusePath:50)
        return

    if @creep.memory.sourceId
      source = Game.getObjectById(@creep.memory.sourceId)
      if (err = @creep.harvest(source) == ERR_NOT_IN_RANGE)
        @creep.moveTo(source, {reusePath:10})
      if err == -7
        delete @creep.memory.sourceId
        @log('Deleting sourceId!!')

module.exports = PositionMiner
