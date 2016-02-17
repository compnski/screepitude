DIRECTIONS = [TOP,
  TOP_RIGHT,
  RIGHT,
  BOTTOM_RIGHT,
  BOTTOM,
  BOTTOM_LEFT,
  LEFT,
  TOP_LEFT]
wiggle = (creep) ->
  creep.log 'wiggle!'
  creep.move(DIRECTIONS[parseInt(Math.random()*DIRECTIONS.length)])

class Waypointer
  constructor: ->
    @WP = (flag for name,flag of Game.flags when name.indexOf("WP_") > -1)

  wpForRoom: (name) ->
    Game.roomNameToPos[name]

  distance: (a, b) ->
    if a.getRangeTo(b) > 10
      return Infinity
    opts = {ignoreCreeps: true, ignoreDestructibleStructures:false}
    if a.constructor != Creep and b.constructor != Creep #and !(Game.flags.NoCache?.color != 'red')
      a.memory ||= {}
      a.distances = a.memory.distances

    a.distances ||= {}
    cache_key = b.id || b

    try
      if a.constructor != Creep and b.constructor != Creep
        a.distances[cache_key] ||= a.findPathTo(b, opts).length
      else
        a.distances[cache_key] ||= a.getRangeTo(b)
    catch e
      console.log e
      console.log e.stack
      a.distances[cache_key] ||= a.getRangeTo(b)

    if a.distances[cache_key] < Infinity and  a.constructor != Creep and b.constructor != Creep
      a.memory ||= {}
      a.memory.distances = a.distances

    return a.distances[cache_key]

  # Finds the next waypoint to go to
  # Specifically, the nearest waypoint that is closer to the target than frm, but at least 4 squares away
  # Optional exclude param to exclude a particular waypoint
  nextWaypointEnRouteTo: (frm, to, exclude=[]) ->
    # Nearest wp to frm, that is closer to to
    return unless frm?
    frm = frm.pos if frm.pos?
    if frm.inRangeTo.constructor != 'function'
      console.log "&&&&&&&&&&&&&&&&&&&&&&&"
      console.log "WEIRD FROM #{frm}"
      return null
    #to = to.pos if to.pos

    opts = {ignoreCreeps: false, ignoreDestructibleStructures:false}
    targetDistance = @distance(frm, to)
    waypoints = (wp for wp in @WP when wp.pos.roomName == frm.roomName && frm.inRangeTo(wp.pos, 10) && exclude.indexOf(wp) == -1 && @distance(frm, wp) > 2 &&  @distance(wp.pos, to) < targetDistance)
    try
      r = frm.findClosestByRange(waypoints, opts)
    catch e
      console.log e
      console.log 'zZZZZZZZzzZZZZZZzzz'
      #r = frm.findClosestByRange(waypoints)
      return null
    r


  # Only pulls a target when needed
  # Otherwise pulls once, then follows a path until it gets there
  # TODO: Add condition to check each time?
  # OR: Have a way to force clear the path

  # moveInfo = [currentPathArray, currentTarget, finalTarget]
  # where currentPathArray is an array of moves to make progress, not always the entire way to currentTarget
  # currentTarget is where we are headed. it may or may not be a WP, if it equals finalTarget we are done when we get there

  buildMoveInfo: (creep, finalTarget) ->
    IGNORE_CREEP_RANGE = 0
    creep.log finalTarget, finalTarget.pos
    path = creep.pos.findPathTo(finalTarget, {maxOps: 1000})
    if path.length and path.length < 100
      return [path, finalTarget.id, finalTarget.id]

    creep.log "No easy path to #{finalTarget}, got #{path}"

    # No easy path found
    # if in another room, then the first target should be the exit
    # if creep.pos.roomName != finalTarget.pos.roomName
    #   exitDir = Game.map.findExit(creep.room, finalTarget.pos.roomName);
    #   target = creep.pos.findClosestByRange(exitDir)
    #   creep.log('exit target', target)
    # else
    target = finalTarget

    path = creep.pos.findPathTo(target, {maxOps: 1000})
    if path.length and path.length < 40
      return [path, target.id, finalTarget.id]

    return null unless target
    nextWp = @nextWaypointEnRouteTo(creep, target)
    return null unless nextWp

    path = creep.pos.findPathTo(nextWp, {maxOps: 1000})
    if path.length
      return [path, target.id, finalTarget.id]

    # Didn't find a path :[
    creep.log "Failed to find path to #{nextWp}, got #{path}"
    return null

  move: (creep, targetFn) ->
    return 0 if creep.fatigue > 0
    if typeof targetFn isnt 'function'
      creep.log "BAD ARG"
      throw new Error("Bad Arg")

    if (creep.pos.y % 49) == 0 && creep.memory.moveInfo?.length
      exitDir = Game.map.findExit(creep.pos.roomName, creep.memory.moveInfo[2])
      creep.move(exitDir)
      creep.log("EXIT MOVING!! " + exitDir)
      #delete creep.memory.moveInfo


    try
      if !creep.memory.moveInfo || creep.memory.moveInfo[0].length == 0 || creep.memory.last_r != creep.pos.roomName# || creep.pos.x != creep.memory.last_x || creep.pos.y != creep.memory.last_y
        creep.log '       NEW PATH'
        target = targetFn(creep)
        creep.memory.moveInfo = @buildMoveInfo(creep, target)
        #creep.say(Game.getObjectById(creep.memory.moveInfo[1]).pos.x + " " + Game.getObjectById(creep.memory.moveInfo[1]).pos.y)

      # TODO: Use final target
      if !creep.memory.moveInfo
        target ||= targetFn(creep)
        ret = creep.moveTo(target)
        if ret < 0
          ret = creep.moveTo(@nextWaypointEnRouteTo(creep, target))
          if ret < 0
            if creep.pos.roomName == target.pos.roomName
              wp = @nearestWaypoint(creep)          
              ret = creep.moveTo(wp) if wp
            else
              exitDir = Game.map.findExit(creep.pos.roomName, target)
              creep.log ("BACKUP MOVE FAILED!! to: #{target} Got #{ret}, going #{exitDir}")
              ret = creep.move(exitDir)
            if ret < 0
              if creep.pos.roomName == target.pos.roomName
                wp = @nearestWaypoint(creep)          
                ret = creep.moveTo(wp) if wp
              else
                exitDir = Game.map.findExit(creep.pos.roomName, target)
                creep.log ("BACKUP MOVE FAILED!! Got #{ret}, going #{exitDir}")
                creep.move(exitDir)
        return ret

      # TODO: Restucture this to move to path, then move along path
      # Look at path, if not in right place then move there?
      # Need to figure out pop + move
      return if creep.memory.moveInfo[0].length == 0
      pl = creep.memory.moveInfo[0].length
      err = creep.moveByPath(creep.memory.moveInfo[0])

      while err == -5 and creep.memory.moveInfo[0].length
        p = creep.memory.moveInfo[0]
        p.pop()
        creep.memory.moveInfo[0] = p
        err = creep.moveByPath(creep.memory.moveInfo[0])

      if err != 0
        creep.log "Error moving!! Got #{err}"
      else
        creep.log 'moved ok to ', JSON.stringify creep.memory.moveInfo[0][0]
        p = creep.memory.moveInfo[0]
        p.pop()
        creep.memory.moveInfo[0] = p

      if creep.memory.last_x == creep.pos.x and creep.memory.last_y == creep.pos.y
        creep.memory.failcount ||= 0
        creep.memory.failcount++
        if creep.memory.failcount > 10
          delete creep.memory.moveInfo
          creep.memory.failcount = 0
          #wiggle(creep)
    finally
      creep.memory.last_x = creep.pos.x
      creep.memory.last_y = creep.pos.y
      creep.memory.last_r = creep.pos.roomName
    return err


  nearestWaypoint: (frm, exclude=[]) ->
    # Nearest wp to frm, that is closer to to
    frm = frm.pos if frm.pos?
    #to = to.pos if to.pos

    opts = {ignoreCreeps: true, ignoreDestructibleStructures:false}
    waypoints = (wp for wp in @WP when wp.pos.roomName == frm.roomName && exclude.indexOf(wp) == -1 && @distance(frm, wp) > 1)
    try
      r = frm.findClosestByPath(waypoints, opts)
    catch e
      console.log e
      console.log e.stack
      return null

    return r


module.exports = Waypointer





  #   r



  # # Work on path using code
  # # Some combination of waypoints and routes
  # # Maybe get entire WP path or maybe just travel to nearest wp that is on route

  # wpPath: (frmWp, toWp) ->
  #   console.log('wpp',  frmWp, toWp)
  #   # Return path of waypoints to get frm one to the other
  #   wp = frmWp
  #   path = [frmWp]
  #   while wp && wp != toWp
  #     wp = @nearestWp(wp, toWp, [frmWp])
  #     # TODO
  #     # if !wp, then find a way point nearest to that room
  #     # get room direction, find WP farthest in that direction along that axis
  #     #
  #     path.push(wp) if wp
  #     if path.length > 50
  #       msg = "Pathfinding loop frm=#{frmWp} to=#{toWp} cur=#{wp} path=#{path}"
  #       console.log msg
  #       Game.notify msg
  #       return path
  #   return path

  #   #find neaest closest?
  # # findExitWaypoint: (frm, to) ->
  # #   frm = frm.pos if frm.pos?

  # #   Game.map.findExit(frm.roomName, to.pos.roomName)

  # getPath: (frm, to) ->
  #   # Returns path to target (or nearest waypoint)
  #   frmWp = @nearestWp(frm, to) || frm
  #   toWp = @nearestWp(to, frm) || to
  #   console.log 'gp', frmWp, toWp
  #   path = @wpPath(frmWp, toWp)
  #   console.log JSON.stringify(path.map((f)->f.name))
  #   if frm.isNearTo(path[0].pos)
  #     path.pop()
  #   if path.length == 0
  #     target = to
  #   else
  #     target = path[0]

  #   frm.findPathTo(target)