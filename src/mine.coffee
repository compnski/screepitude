class Mine
  constructor: (source) ->
    @source = source

  capacity: ->
    x = @source.pos.x
    y = @source.pos.y
    res = @source.room.lookForAtArea('terrain', y-1,x-1,y+1,x+1)
    wallCount = 0
    for x, ys of res
      for y, things of ys
        for thing in things
          if thing == 'wall'
            wallCount += 1
            break
    return 9 - wallCount

  @allInRoom: (room) ->
    sources = room.find(FIND_SOURCES)
    sources.map((s) -> new Mine(s))

module.exports = Mine