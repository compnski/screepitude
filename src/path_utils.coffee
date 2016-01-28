class PathUtils

	constructor: (@pos) ->
		@pos = @pos.pos if @pos.pos?

	sortByDistance: (targets) ->
		targets.sort(@distanceComparator)

	distance: (target) ->
		@pos.getRangeTo(target)

	distanceComparator: (a,b) =>
		a.distance ?= @distance(a)
		b.distance ?= @distance(b)
		return a.distance - b.distance

module.exports = PathUtils