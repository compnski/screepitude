realStart = Game.cpu.getUsed()

cpuOverBudget = ->
  ((Game.cpu.bucket < 5000 and Game.cpu.getUsed() > 100)  or
  (Game.cpu.bucket < 2000 and Game.cpu.getUsed() > 30)  or
  (Game.cpu.bucket < 1000 and Game.cpu.getUsed() > 10)  or
  Game.cpu.bucket < 100)

shuffle = (arr, required=arr.length) ->
      randInt = (n) -> Math.floor n * Math.random()
      required = arr.length if required > arr.length
      return arr[randInt(arr.length)] if required <= 1

      for i in [arr.length - 1 .. arr.length - required]
        index = randInt(i+1)
        # Exchange the last unshuffled element with the 
        # selected element; reduces algorithm to O(n) time
        [arr[index], arr[i]] = [arr[i], arr[index]]

      # returns only the slice that we shuffled
      arr[arr.length - required ..]
Array.prototype.sum = ->
  return 0 unless @length
  @.reduce((a,b) -> a+b)

String.prototype.paddingLeft = (paddingValue) ->
   return String(paddingValue + this).slice(-paddingValue.length)

Creep.prototype.roleName = ->
  p = @name.split("_")
  p.pop()
  p.join("_")

Creep.prototype.canRepair = ->
  (@body.filter (s) -> s.type == WORK && s.hits).length > 0

Creep.prototype.canHeal = ->
  (@body.filter (s) -> s.type == HEAL && s.hits).length > 0

Creep.prototype.canAttack = ->
  (@body.filter (s) -> s.type == ATTACK && s.hits).length > 0

Creep.prototype.canShoot = ->
  (@body.filter (s) -> s.type == RANGED_ATTACK && s.hits).length > 0


Creep.prototype.index = ->
  parts = @name.split("_")
  parts[parts.length-2]

Creep.prototype.log = (msg...) ->
    console.log("[#{@name}]", msg...) unless Config.LogFilter? and @name.indexOf(Config.LogFilter) < 0

Game.killAllCreeps = ->
  Game.memory = {}
  (c.suicide() for n,c of Game.creeps)

#(creep.suicide() for name, creep of Game.creeps when creep.index() > 3)

Config = require('config')
return if Game.cpu.bucket < 500 unless Config.CpuOverride

Roles = require('roles')
Tasks = require('tasks')
PathUtils = require('path_utils')
Utils = require('utils')

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES)
primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS)
primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS)
primaryTower = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_TOWER)[0] 
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0] ||  primarySpawn

room1Pos = Game.flags.Room1?.pos
room2 = Game.flags.Room2?.room
room2Pos = Game.flags.Room2?.pos
room3 = Game.flags.Room3?.room
room3Pos = Game.flags.Room3?.pos
room4 = Game.flags.Room4?.room
room4Pos = Game.flags.Room4?.pos
room5 = Game.flags.Room5?.room
room5Pos = Game.flags.Room5?.pos

room6 = Game.flags.Room6?.room
room6Pos = Game.flags.Room6?.pos

roomNameToPos = {}
roomNameToPos[room1Pos?.roomName] = room1Pos
roomNameToPos[room2Pos?.roomName] = room2Pos
roomNameToPos[room3Pos?.roomName] = room3Pos
roomNameToPos[room4Pos?.roomName] = room4Pos
roomNameToPos[room5Pos?.roomName] = room5Pos
roomNameToPos[room6Pos?.roomName] = room6Pos

Game.roomNameToPos = roomNameToPos



TaskCounts = {}
for t in Tasks
  TaskCounts[t.role] ||= 0
  TaskCounts[t.role] += t.count

Creeps = {}
for name, creep of Game.creeps
  Creeps[creep.roleName()] = creep.id

try
  Waypointer = require('waypointer')
  Game.wp = new Waypointer()
catch e
  console.log "Failed to intialize waypoints!"
  console.log e
  console.log e.stack



# If target has an id, get the id, otherwise it's a string so leave it as is. 
# TBD, if a function, find a way to serialize it
serializeArg = (arg) ->
  return {'id': arg.id} if arg.id?
  return {'function': arg} if typeof(Utils[arg]) == 'function'
  return arg 

resolveArgs = (creep) ->
  return (arg) ->
    return Game.getObjectById(arg.id) if arg.id?
    return Utils[arg.function](creep) if arg.function? and typeof(Utils[arg.function]) == 'function'

    return Utils[arg](creep) if arg? and typeof(Utils[arg]) == 'function'
    return arg.function if arg.function?
    arg

class Role
  run: (realStartCpu) ->
    startCpu = Game.cpu.getUsed()
    try
      for _, spawn of Game.spawns
        continue if cpuOverBudget()
        storage = spawn.room.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == STRUCTURE_STORAGE)[0]
        towerEnergy = @runTowers(spawn.room)
        #towerCpu = Game.cpu.getUsed()
        @runSpawner(spawn)
        #spawnCpu = Game.cpu.getUsed()
        creepEnergy = (creep.carry.energy for creep in spawn.room.find(FIND_MY_CREEPS)).sum()
        console.log(" Spawn: #{@spawnEnergy(spawn.room)}/#{@spawnEnergyCapacity(spawn.room)}\tTower: #{towerEnergy}\tCreep: #{creepEnergy}\tStore: #{storage?.store.energy}\t")
    catch e
      console.log ("Failed to run spawn: #{e.stack}")
    roomCpu = Game.cpu.getUsed()
    try
      timings = @runCreeps()
    catch e
      console.log e
      console.log e.stack
    endCpu = Game.cpu.getUsed()
    console.log("Time total: #{endCpu - realStartCpu}\t\t Load: #{startCpu - realStartCpu}\t\tCode: #{endCpu - startCpu}\t\tBase: #{roomCpu - startCpu}\t\t Creep: #{endCpu - roomCpu}\t\tCPU Bucket: #{Game.cpu.bucket}")
    console.log(("#{n}: #{t}" for n, t of timings when t > 10).join("\n")) if (endCpu - roomCpu) > 20

  runSpawner: (spawn) ->
    waitingToSpawn = false
    if spawn.spawning
      console.log("#{spawn.name} Spawning #{JSON.stringify(spawn.spawning)}")
    curCreepCount = {}
    for t in Tasks
      continue if t.spawn == 'Spawn2' && spawn.name != 'Spawn2'
      continue if spawn.name == 'Spawn2' && t.spawn != 'Spawn2'
      continue if t.count == 0
      #continue if t.condition? and !t.condition()
      start = curCreepCount[t.role] || 0
      for idx in [start..(start+t.count-1)]
        roleName = "#{t.role}_#{idx}"
        creepId = Creeps[roleName]
        if !creepId? # || creep.ticksToLive < 200
          if !spawn.spawning && !waitingToSpawn
            continue if t.count == 0
            continue if t.condition? and !t.condition()

            waitingToSpawn = @spawnCreepFromTask(spawn, roleName, t)
        else
          creep = Game.getObjectById(creepId)
          creep['action'] = t.action
          creep['args'] = t.args.map(serializeArg) if t.args
      curCreepCount[t.role] = start + t.count 

  runTowers: (room) ->
    room.my_structures = room.find(FIND_MY_STRUCTURES)
    room.my_creeps = room.find(FIND_MY_CREEPS)
    room.hostile_creeps = room.find(FIND_HOSTILE_CREEPS)

    energy = 0
    attacked = false
    for tower in room.my_structures.filter((s)->s.structureType == 'tower')
      pathUtils = new PathUtils(tower)

      try
        nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter((c)-> (c.body.filter((b)->b.type==HEAL && b.hits).length > 0)))[0]
        nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps.filter((c)-> (c.body.filter((b)->b.type==RANGED_ATTACK && b.hits).length > 0)))[0]
      catch e
        console.log e
        console.log e.stack
      nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps)[0]

      if nearestTarget?
        attacked = true
        tower.attack(nearestTarget) 

      if !attacked and tower.energy > tower.energyCapacity * 0.75
        nearestTarget = pathUtils.sortByDistance(room.my_creeps.filter((c)->c.hits < c.hitsMax))[0]
        tower.heal(nearestTarget) if nearestTarget?

        nearestTarget = pathUtils.sortByDistance(room.my_structures.filter(Utils.needsRepair))[0]
        unless nearestTarget
          nearestTarget = pathUtils.sortByDistance(room.find(FIND_STRUCTURES).filter(Utils.needsRepair))[0]
        console.log "tower repair", nearestTarget
        tower.repair(nearestTarget) if nearestTarget? #and tower.pos.getRangeTo(nearestTarget) < 5
      energy += tower.energy

    return energy


  runCreeps: ->
    timings = {}
    for creepId in shuffle(creepId for _, creepId of Creeps)
      start = Game.cpu.getUsed()
      creep = Game.getObjectById(creepId)
      continue unless creep?
      try
        break if cpuOverBudget()
        continue unless creep.ticksToLive
        @runCreep(creep)
      catch e
        console.log("Error running creeps #{creep.name}: #{e}")
        console.log(e.stack)
      finally
        n_p = creep.name.split("_")
        n = n_p[0...(n_p.length-2)].join("_")
        timings[n] ||= 0
        timings[n] += (Game.cpu.getUsed() - start)
    timings        

  spawnCreepFromTask: (spawnFrom, roleName, task) ->
    room = spawnFrom.room
    name = @nameForRole(roleName)
    parts = @makeRole(task.body)
    memory = task.memory || {}
    partsCost = @partsCost(parts)
    if partsCost > @spawnEnergyCapacity(room)
      console.log("Can't spawn #{roleName} due to max capacity -- have #{@spawnEnergyCapacity(room)}/#{partsCost}")
      Game.notify("Can't spawn #{roleName} due to max capacity -- have #{@spawnEnergyCapacity(room)}/#{partsCost}",60)
      return false
      console.log "Would spawn creep #{name} with #{memory} and #{parts}"
    ret = 0
    ret = spawnFrom.createCreep(parts, name, memory)
    if ret == ERR_NOT_ENOUGH_RESOURCES
      console.log("Can't spawn #{roleName} due to resources -- have #{@spawnEnergy(room)}/#{partsCost}")
      return true
    else if ret < 0
      console.log("Can't spawn #{roleName} due to other error: #{ret} -- have #{@spawnEnergy(room)}/#{partsCost}")
      Memory.totalCreepCounts[roleName]++ if ret == -3
      return false
    else
      Memory.totalCreepCounts[roleName]++ if ret == 0
      console.log("Spawning #{roleName} named #{name} from #{spawnFrom.name} with #{parts} and #{JSON.stringify(memory)}, got #{ret}")
    true

  runCreep: (creep) ->
    if !creep.memory?
      console.log 'bad memory'
      return
    return if creep.memory.role == 'piler'
    #return if creep.name.indexOf("piler") > -1
    action = creep.action
    if action? and Roles[action]?
      return Roles[action](creep, (creep.args||[]).map(resolveArgs(creep))...)
    else
      creep.log("Failed to run action for #{creep.name} - action = #{creep.action}")
      creep.memory.flailCount ||= 0
      if creep.memory.flailCount++ > 10
        creep.suicide()


  partsCost: (parts) ->
    parts.map((s)->
      switch s
        when TOUGH then 10
        when MOVE, CARRY then 50
        when ATTACK then 80
        when WORK then 100
        when RANGED_ATTACK then 150
        when HEAL then 250
        when CLAIM then 600
      ).sum()

  makeRole: (partsMap) ->
      parts = []
      for part, count of partsMap
          for i in [0...count]
              parts.push(part)
      return parts

  nameForRole: (roleName) ->
    Memory.totalCreepCounts ||= {}
    Memory.totalCreepCounts[roleName] ||= 0
    return "#{roleName}_#{Memory.totalCreepCounts[roleName]}"

  spawnEnergyCapacity: (room) ->
    (s.energyCapacity for s in room.find(FIND_MY_STRUCTURES) when s.structureType == 'extension' || s.structureType == "spawn").sum()

  spawnEnergy: (room) ->
    (s.energy for s in room.find(FIND_MY_STRUCTURES) when s.structureType == 'extension' || s.structureType == "spawn").sum()


r = new Role()
r.run(realStart)

# try
#   r.run(realStart)
# catch e
#   console.log "RUN STACK TRACE"
#   throw e
#   console.log e.message
#   console.log e.stacktrace




# #console.log(Game.spawns.Spawn1.pos, Game.flags.Outside.pos)
# console.log wp.getPath(Game.spawns.Spawn1.pos, Game.flags.Room2.pos)

# if Game.cpu.getUsed() < 30
#   s = Game.cpu.getUsed()
#   TransportSystem = require('transport_system')
#   new TransportSystem().run()
#   console.log "Transport took #{Game.cpu.getUsed() - s}"

# for _, flag in Game.flags
#     delete flag.memory