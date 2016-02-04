PathUtils = require('path_utils')
Deliverator = require('deliverator')
Config = require('config')
Tasks = require ('tasks')

isAlly = (username) ->
  ['omgbear', 'ganz', 'fezeral', 'scorps'].indexOf() > -1

isEnemy = (username) ->
  !isAlly(username)

t1 = Game.cpu.getUsed()
primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES)
primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS)
primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS)
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0]



TaskCounts = {}
for t in Tasks
  TaskCounts[t.role] ||= 0
  TaskCounts[t.role] += t.count

Creeps = {}
for name, creep of Game.creeps
  Creeps[creep.roleName()] = creep.id

Utils = {}

Utils.CarryStuff = (creep, from, to) ->
  # if arg is function, then call it. passing in the creep
  new Deliverator(creep, from, to).loop()
Utils.primarySpawnOrExtension = ->
  # TODO: Cache
  primaryRoom.my_structures.filter((c) -> 
    (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)

Utils.nearestPrimarySpawnOrExtension = (creep) ->
  targets = new PathUtils(creep).sortByDistance(Utils.primarySpawnOrExtension())
  targets[0]

Utils.nearestTowerSpawnExtension = (creep) ->
  targets = primaryRoom.my_structures.filter((c) -> 
    (c.structureType == 'tower') && c.energy < c.energyCapacity)
  if targets.length == 0
    targets = Utils.primarySpawnOrExtension()
  targets = new PathUtils(creep).sortByDistance(targets)
  targets[0]

Utils.energyProviders = (creep) ->
  s = creep.room.find(FIND_MY_CREEPS).filter((c)->c.carryCapacity > 200 && c.carry.energy > 100)
  s.push(primaryStorage)
  s

Utils.mineFlagByIndex = (creep) ->
  MineFlags[creep.index() % MineFlags.length-1]

Utils.guardFlagByIndex = (creep) ->
  GuardFlags[creep.index() % GuardFlags.length-1]

Utils.Repair = (creep, source) ->
  new Deliverator(creep, source,new PathUtils(creep).sortByDistance(primaryRoom.my_structures.filter(
    (s)->s.structureType != 'rampart' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP)))[0]).loop()

Utils.BuildThings = (creep) ->
  new Builder(creep, null, Game.flags.BuildHere).loop()

Utils.HealFlag = (creep, rally, leash_distance=5) ->
  rally ||= Game.flags.HuntersMark2
  if !creep.pos.inRangeTo(rally,leash_distance + 3)
    return creep.moveTo(rally.pos, {ignoreDestructibleStructures:true, maxOps: 1000})

  room = creep.room
  room.friendly_creeps ?= room.find(FIND_MY_CREEPS)


  pathUtils = new PathUtils(creep)
  nearestTarget = pathUtils.sortByDistance(room.friendly_creeps.filter((c)->c.hits<c.hitsMax))[0]
  nearestTarget = null if nearestTarget? && rally.pos.getRangeTo(nearestTarget) > leash_distance

  if nearestTarget?
    if creep.rangedHeal(nearestTarget) == ERR_NOT_IN_RANGE
      creep.moveTo(nearestTarget)
  else
    creep.moveTo(rally.pos)

Utils.GuardFlag = (creep, rally, leash_distance=5) ->
  rally ||= Game.flags.HuntersMark2
  if !creep.pos.inRangeTo(rally,leash_distance)
    creep.log("Too far")
    return creep.moveTo(rally.pos)

  room = creep.room
  room.hostile_creeps ?= room.find(FIND_HOSTILE_CREEPS)
  #console.log JSON.stringify(room.hostile_creeps[0].body)

  nearestTarget = null
  pathUtils = new PathUtils(creep)
  #nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter((c)->c.body.filter((b)->b.type==HEAL && b.hits)).length > 0) [0]
  #nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps.filter((c)->c.body.filter((b)->b.type==RANGED_ATTACK && b.hits)).length > 0)[0]
  nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps)[0]
  
  nearestTarget = null if nearestTarget? && rally.pos.getRangeTo(nearestTarget) > leash_distance

  if nearestTarget?
    console.log("Nearing in on #{nearestTarget.id} at #{creep.pos.getRangeTo(nearestTarget)}")
    attacked = true
    if creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length > 0 && isEnemy(nearestTarget.owner.username)
      if ((err = creep.attack(nearestTarget)) == ERR_NOT_IN_RANGE)
        creep.moveTo(nearestTarget)

    if creep.body.filter((p)->p.type == RANGED_ATTACK && p.hits > 0).length > 0 && isEnemy(nearestTarget.owner.username)
      if ((err = creep.rangedAttack(nearestTarget)) == ERR_NOT_IN_RANGE)
        creep.moveTo(nearestTarget)
  else
    creep.moveTo(rally.pos)



  # target = new PathUtils(creep).sortByDistance(creep.room.find(FIND_HOSTILE_CREEPS))[0]
  # target = null if target? && rally.pos.getRangeTo(target) > leash_distance
  # if !target? && !creep.pos.inRangeTo(rally,2)
  #   return creep.moveTo(rally.pos, {ignoreDestructibleStructures:true, maxOps: 1000})

  # if !creep.pos.isNearTo(target)
  #   return creep.moveTo(rally.pos, {ignoreDestructibleStructures:true, maxOps: 1000})

  #  console.log creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length, isEnemy(target.owner.username)

  # if creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length > 0 && isEnemy(target.owner.username)
  #   if ((err = creep.attack(target)) == ERR_NOT_IN_RANGE)
  #     creep.moveTo(target)
  # if creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length > 0 && isAlly(target.owner.username)
  #   if ((err = creep.heal(target)) == ERR_NOT_IN_RANGE)
  #     creep.moveTo(target)
  # else if err < 0
  #   console.log "Attack error #{err}"

Utils.minerByIndex = (index) ->
  index = index % TaskCounts["miner"]
  return Game.getObjectById(Creeps["miner_#{index}"])


GuardFlags = [
  Game.flags.HuntersMark2
]

MineFlags = [
  Game.flags.Mine_1_1,
  Game.flags.Mine_1_2,
  Game.flags.Mine_3_1,
  Game.flags.Mine_3_2,
  Game.flags.Mine_4_1,
]

Utils.FlagMiner = (creep) -> 
  return if creep.carry.energy == creep.carryCapacity
  index = creep.index()
  targetFlag = MineFlags[index % MineFlags.length]

  if targetFlag.pos.roomName != creep.pos.roomName
    err = creep.moveTo(targetFlag.pos, {reusePath:40, ignoreCreeps:false, maxOps:1000})
    console.log("flag miner error = #{err}") if err != 0
    return
  if !creep.memory.sourceId
    creep.memory.sourceId = new PathUtils(targetFlag.pos).sortByDistance(targetFlag.room.find(FIND_SOURCES))[0].id
  if creep.memory.sourceId
    source = Game.getObjectById(creep.memory.sourceId)
  if !creep.pos.isNearTo(source.pos)
    creep.moveTo(source, {reusePath:10})
  if creep.harvest(source) == -7
    delete creep.memory.sourceId

Utils.MineTransporter = (creep, dumpLocation) ->
  source = Utils.minerByIndex(creep.index())
  new Deliverator(creep, source, dumpLocation).loop() if source?

# If target has an id, get the id, otherwise it's a string so leave it as is. 
# TBD, if a function, find a way to serialize it
serializeArg = (arg) ->
  return {'id': arg.id} if arg.id?
  return {'function': arg} if typeof(Utils[arg.function]) == 'function'
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
    for _, spawn of Game.spawns
      storage = spawn.room.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == STRUCTURE_STORAGE)[0]
      towerEnergy = @runTowers(spawn.room)
      #towerCpu = Game.cpu.getUsed()
      @runSpawner(spawn)
      #spawnCpu = Game.cpu.getUsed()
      creepEnergy = (creep.carry.energy for creep in spawn.room.find(FIND_MY_CREEPS)).sum()
      console.log(" Spawn: #{@spawnEnergy(spawn.room)}/#{@spawnEnergyCapacity(spawn.room)}\tTower: #{towerEnergy}\tCreep: #{creepEnergy}\tStore: #{storage.store.energy}\t")
    roomCpu = Game.cpu.getUsed()
    @runCreeps()
    endCpu = Game.cpu.getUsed()
    console.log("Time total: #{endCpu - realStartCpu}\t\t Load: #{startCpu - realStartCpu}\t\tCode: #{endCpu - startCpu}\t\tBase: #{roomCpu - startCpu}\t\t Creep: #{endCpu - roomCpu}\t\tCPU Bucket: #{Game.cpu.bucket}")

  runSpawner: (spawn) ->
    if spawn.spawning
      console.log("Spawning #{JSON.stringify(spawn.spawning)}")
    curCreepCount = {}
    for t in Tasks
      start = curCreepCount[t.role] || 0
      for idx in [start..(start+t.count-1)]
        roleName = "#{t.role}_#{idx}"
        creepId = Creeps[roleName]
        if !creepId? # || creep.ticksToLive < 200
          if !spawn.spawning
            return if @spawnCreepFromTask(spawn, roleName, t)
        else
          creep = Game.getObjectById(creepId)
          continue if creep.memory.action?
          creep.memory = Memory[creep.name] ||= {}
          creep.memory.action = t.action
          creep.memory.roleName = roleName
          creep.memory.args = t.args
      curCreepCount[t.role] = start + idx

  runTowers: (room) ->
    energy = 0
    for tower in tower = room.my_structures.filter((s)->s.structureType == 'tower')
      pathUtils = new PathUtils(tower)
      nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter((c)->c.body.indexOf(HEAL) > -1))[0]
      nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps.filter((c)->c.body.indexOf(RANGED_ATTACK) > -1))[0]
      nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps)[0]

      if nearestTarget?
        attacked = true
        tower.attack(nearestTarget) 

      if !attacked and tower.energy > tower.energyCapacity / 2
        nearestTarget = pathUtils.sortByDistance(room.my_creeps.filter((c)->c.hits < c.hitsMax))
        tower.heal(nearestTarget) if nearestTarget?

        nearestTarget = pathUtils.sortByDistance(room.my_structures.filter((s)-> s.hits < Math.min(s.hitsMax, Config.MaxWallHP)))[0]
        unless nearestTarget?
          nearestTarget = pathUtils.sortByDistance(room.find(FIND_STRUCTURES).filter((s)-> s.structureType == STRUCTURE_ROAD && s.hits < Math.min(s.hitsMax, Config.MaxWallHP)))[0]
        tower.repair(nearestTarget) if nearestTarget? #and tower.pos.getRangeTo(nearestTarget) < 5
      energy += tower.energy

    return energy


  runCreeps: ->
    for _, creepId of Creeps
      creep = Game.getObjectById(creepId)
      try
        @runCreep(creep)
      catch e
        creep.log(creep)
        creep.log(e.stack)
        creep.log("Error running creeps #{creep.role}_#{creep.index}")

  spawnCreepFromTask: (spawnFrom, roleName, task) ->
    room = spawnFrom.room
    name = @nameForRole(roleName)
    parts = @makeRole(task.body)
    memory = {'action': task.action, args: task.args.map(serializeArg), roleName: roleName}
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
      room.memory.totalCreepCounts[roleName]++ if ret == -3
      return false
    else
      room.memory.totalCreepCounts[roleName]++ if ret == 0
      console.log("Spawning #{roleName} named #{name} from #{spawnFrom.name} with #{parts} and #{JSON.stringify(memory)}, got #{ret}")
    true

  runCreep: (creep) ->
    action = creep.memory.action
    if action? and Utils[action]?
      return Utils[action](creep, creep.memory.args.map(resolveArgs(creep))...)
    else
      creep.log("Failed to run action for #{creep.name} - action = #{creep.action}, memory = #{JSON.stringify(creep.memory)}")

  partsCost: (parts) ->
    parts.map((s)->
      switch s
        when TOUGH then 10
        when MOVE, CARRY then 50
        when ATTACK then 80
        when WORK then 100
        when RANGED_ATTACK then 150
        when HEAL then 250
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

class Builder extends Deliverator
  constructor: (@creep, sourceFn=null, rallyFlag=null) ->
    if rallyFlag?
      @target = rallyFlag
    else
      @target = creep
    
    unless sourceFn?
      @pathUtils ||= new PathUtils(@target)
      source = @pathUtils.sortByDistance(Utils.energyProviders(creep))[0]
      console.log source
    super(creep, source, @constructionSite())
    creep.memory.energyRequester = true

  ramparts: (s) ->
    (s.structureType == 'rampart') && (s.hits < Math.min(Config.MaxWallHP, s.hitsMax))

  walls: (s) ->
    s.structureType == 'constructedWall' && s.hits < Math.min(s.hitsMax, (Config.MaxWallHP || 3000000))

  constructionSite: =>
    @pathUtils ||= new PathUtils(@target)
    sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_CONSTRUCTION_SITES))
    if sites.length == 0# && @creep.memory.role == 'far_builder'
      sites = []
      sites = sites.concat(Game.flags.Room2?.room?.find(FIND_MY_CONSTRUCTION_SITES))
      sites = sites.concat(Game.flags.Room3?.room?.find(FIND_MY_CONSTRUCTION_SITES))
      sites = @pathUtils.sortByDistance(sites)
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_MY_STRUCTURES).filter(@ramparts))
    if sites.length == 0
      sites = @pathUtils.sortByDistance(@creep.room.find(FIND_STRUCTURES).filter(@walls))
    #if sites.length == 0
    #  sites = [@creep.room.controller] if @creep.room.controller.owner.username == "omgbear"
    sites[0]

module.exports = Role
