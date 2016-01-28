class PathUtils

	@sortByDistance: (from, targets) ->
		targets.sort(@distanceComparatorFactory(from.pos))

	@distance: (a, b) ->
		a.getRangeTo(b)

	@distanceComparatorFactory: (from) ->
		return (a,b) ->
			a.distance ?= PathUtils.distance(from, a)
			b.distance ?= PathUtils.distance(from, b)
			return a.distance - b.distance

module.exports = PathUtils