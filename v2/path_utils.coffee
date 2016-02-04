class PathUtils
  constructor: (@pos) ->
    @pos = @pos.pos if @pos.pos
    @pos_S = "#{@pos.roomName}_#{@pos.x}_#{@pos.y}"

  sortByDistance: (targets) ->
    t=targets.sort(@distanceComparator)
    t

  distance: (target) ->
    @pos.getRangeTo(target)

  distanceComparator: (a,b) =>
    a.distances ?= {}
    a.distances[@pos_S] ?= @distance(a)
    b.distances ?= {}
    b.distances[@pos_S] ?= @distance(b)
    return a.distances[@pos_S] - b.distances[@pos_S]

module.exports = PathUtils
