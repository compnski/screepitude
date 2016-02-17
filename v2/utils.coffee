Config = require('config')
Tasks = require ('tasks')

t1 = Game.cpu.getUsed()
primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryTower = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_TOWER)[0] 
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0] ||  primarySpawn



TaskCounts = {}
for t in Tasks
  TaskCounts[t.role] ||= 0
  TaskCounts[t.role] += t.count

Creeps = {}
for name, creep of Game.creeps
  Creeps[creep.roleName()] = creep.id


class Utils
  @minerByIndex: (index) ->
    index = index % TaskCounts["miner"]
    return Game.getObjectById(Creeps["miner_#{index}"])

  @isAlly: (username) ->
    ['omgbear', 'ganz', 'fezeral', 'scorps'].indexOf() > -1
  @isEnemy: (username) ->
    !Utils.isAlly(username)

  @primarySpawnOrExtension: ->
    # TODO: Cache? Can energy change in same tick?
    primaryRoom.my_structures.filter((c) -> 
      (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)

  @nearestTowerSpawnExtension: (creep) ->
    creep.room.my_structures ||= creep.room.find(FIND_MY_STRUCTURES)
    priority_targets = creep.room.my_structures.filter((c) -> 
      (c.structureType == 'tower') && c.energy < c.energyCapacity*0.33)
    return creep.pos.findClosestByPath(priority_targets) if priority_targets.length

    targets = creep.room.my_structures.filter((c) -> 
      (c.structureType == 'tower') && c.energy < c.energyCapacity*0.66)
    #if targets.length == 0
    # TODO: Prioritize tower if there are hostiles around
    targets = targets.concat(creep.room.my_structures.filter((c) -> 
      (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity))

    if targets.length == 0 #If no targets, cap off tower.
      targets = creep.room.my_structures.filter((c) -> 
        (c.structureType == 'tower') && c.energy < c.energyCapacity)
    return creep.pos.findClosestByPath(targets)

  @nearestStorage: (creep) ->
    creep.room.my_structures ||= creep.room.find(FIND_MY_STRUCTURES)
    targets = creep.room.my_structures.filter((s) -> s.structureType == STRUCTURE_STORAGE)

    unless targets.length
      targets = creep.room.my_structures.filter((s) -> s.structureType == STRUCTURE_TOWER && s.energy > s.energyCapacity * 0.9)

    # unless targets.length
    #   targets = creep.room.my_structures.filter((s) -> s.structureType == STRUCTURE_SPAWN && s.energy < s.energyCapacity)

    # unless targets.length
    #   targets = creep.room.my_structures.filter((s) -> s.structureType == STRUCTURE_EXTENSION && s.energy < s.energyCapacity)

    #unless targets.length
    #  targets = [primaryStorage]
    return null if targets.length == 0

    return creep.pos.findClosestByPath(targets)

  @energyProviders: (creep) ->
    s = [] #creep.room.find(FIND_MY_CREEPS).filter((c)->c.name.indexOf("miner") > -1)
    s = s.concat(creep.room.find(FIND_DROPPED_ENERGY).filter((s) -> creep.pos.getRangeTo(s) < 25))
    if s.length == 0 && ((primaryStorage.store.energy || primaryStorage.energy) < 50 || creep.pos.getRangeTo(primaryStorage) > 25)
      s = s.concat(creep.room.find(FIND_SOURCES).filter(((c)->c.energy > 100 || c.ticksToRegeneration < 10)))
    # TODO: Add resource hub bots
    storage = Utils.nearestStorage(creep)
    s.push(storage) if storage?
    return s
    
  @nearestEnergyProvider: (creep) ->
    ep = Utils.energyProviders(creep)
    return null unless ep.length
    creep.pos.findClosestByPath(ep)

  @mineFlagByIndex: (creep) ->
    Config.MineFlags[creep.index() % Config.MineFlags.length-1]

  @guardFlagByIndex: (creep) ->
    GuardFlags[creep.index() % GuardFlags.length-1]

  @needsRepair: (s) -> 
    s.hits < Math.min(s.hitsMax, Config.MaxWallHP)

  @ownedByMe: (s) ->
    s.owner && s.owner.username == 'omgbear'

module.exports = Utils





# Utils.HealFlag = (creep, rally, leash_distance=5) ->
#   rally ||= Game.flags.HuntersMark2
#   if !creep.pos.inRangeTo(rally,leash_distance + 3)
#     return creep.moveTo(rally.pos, {ignoreDestructibleStructures:true, maxOps: 1000})

#   room = creep.room
#   room.friendly_creeps ?= room.find(FIND_MY_CREEPS)


#   pathUtils = new PathUtils(creep)
#   nearestTarget = pathUtils.sortByDistance(room.friendly_creeps.filter((c)->c.hits<c.hitsMax))[0]
#   nearestTarget = null if nearestTarget? && rally.pos.getRangeTo(nearestTarget) > leash_distance

#   if nearestTarget?
#     if creep.rangedHeal(nearestTarget) == ERR_NOT_IN_RANGE
#       creep.moveTo(nearestTarget)
#   else
#     creep.moveTo(rally.pos)

# Utils.GuardFlag = (creep, rally, leash_distance=5) ->
#   rally ||= Game.flags.HuntersMark2
#   if !creep.pos.inRangeTo(rally,leash_distance)
#     return creep.moveTo(rally.pos)

#   room = creep.room
#   room.hostile_creeps ?= room.find(FIND_HOSTILE_CREEPS)
#   #console.log JSON.stringify(room.hostile_creeps[0].body)

#   nearestTarget = null
#   pathUtils = new PathUtils(creep)
#   try
#     #nearestTarget = pathUtils.sortByDistance(room.hostile_creeps.filter((c)-> (c.body.filter((b)->b.type==HEAL && b.hits).length > 0)))[0]
#     #nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps.filter((c)-> (c.body.filter((b)->b.type==RANGED_ATTACK && b.hits).length > 0)))[0]
#   catch e
#     creep.log e
#     creep.log e.stacktrace

#   #nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps.filter((c)->c.body.filter((b)->b.type==RANGED_ATTACK && b.hits)).length > 0)[0]
#   nearestTarget ||= pathUtils.sortByDistance(room.hostile_creeps)[0]
  
#   nearestTarget = null if nearestTarget? && rally.pos.getRangeTo(nearestTarget) > leash_distance

#   if nearestTarget?
#     console.log("Nearing in on #{nearestTarget.id} at #{creep.pos.getRangeTo(nearestTarget)}")
#     attacked = true
#     if creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length > 0 && Utils.isEnemy(nearestTarget.owner.username)
#       if ((err = creep.attack(nearestTarget)) == ERR_NOT_IN_RANGE)
#         creep.moveTo(nearestTarget)
#       else if err < 0
#         creep.log("Attack failed!! #{err}")

#     if creep.body.filter((p)->p.type == RANGED_ATTACK && p.hits > 0).length > 0 && Utils.isEnemy(nearestTarget.owner.username)
#       if ((err = creep.rangedAttack(nearestTarget)) == ERR_NOT_IN_RANGE)
#         creep.moveTo(nearestTarget)
#       else if err < 0
#         creep.log("RangedAttack failed!! #{err}")

#   else
#     creep.moveTo(rally.pos)



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
  # if creep.body.filter((p)->p.type == ATTACK && p.hits > 0).length > 0 && Utils.isAlly(target.owner.username)
  #   if ((err = creep.heal(target)) == ERR_NOT_IN_RANGE)
  #     creep.moveTo(target)
  # else if err < 0
  #   console.log "Attack error #{err}"

