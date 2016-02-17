PathUtils = require('path_utils')
Deliverator = require('deliverator')
Config = require('config')
Tasks = require ('tasks')
Utils = require('utils')

t1 = Game.cpu.getUsed()
primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES)
primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS)
primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS)
primaryTower = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_TOWER)[0] 
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0] ||  primarySpawn


TaskCounts = {}
for t in Tasks
  TaskCounts[t.role] ||= 0
  TaskCounts[t.role] += t.count

Creeps = {}
for name, creep of Game.creeps
  Creeps[creep.roleName()] = creep.id


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



moveTo = (creep, to, opts={}) ->
  return 0 if creep.fatigue > 0
  opts["maxOps"] = 1000

  #console.log Game.wp.getPath(creep.pos, to)

  #to = to.pos if to.pos?
  #if to.pos.roomName != creep.pos.roomName
  #  to = Game.roomNameToPos[to.roomName]

  err = creep.moveTo(to, opts)
  creep.log err if err < 0
  if err == -2
    opts["reusePath"] = 30
    opts["maxOps"] = 3000
    opts["ignoreCreeps"] = true
    if creep.moveTo(to, opts) == -2
      if creep.pos.roomName != to.pos.roomName
        creep.log "going to the next room", Game.map.findExit(creep.pos.roomName, to.pos.roomName)
        creep.log JSON.stringify(to)
        creep.move(Game.map.findExit(creep.pos.roomName, to.pos.roomName))
      else
        creep.log "HELPPpppppppppppp"
  0

class Roles

  @Piler: (creep) ->
    creep.memory.role = 'piler'

  @Upgrade: (creep, targetFlag) ->
    # if !creep.pos.inRangeTo(targetFlag, 15)
    #   Game.wp.move(creep, -> targetFlag)
    #   return
    for _, s of Game.spawns
      if targetFlag.pos.roomName == s.pos.roomName
        if s.energy < 200# && !Creep["small_transporter_0_0"]
          Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), s)
          return

    Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), targetFlag.room.controller)

  @Repair: (creep, targetFlag) ->
    if Game.flags.RepairHere? and Game.flags.RepairHere.color != 'red'
      sourcePos = Game.flags.RepairHere.pos
    else 
      if Game.flags.BuildHere? and Game.flags.BuildHere.color == 'green'
        return if Roles.Build(creep, targetFlag)

      sourcePos = creep.pos

    target = Game.getObjectById(creep.memory.repairTargetId) unless Game.flags.ClearTarget?.color == 'red'
    target = null if target and target.hits == target.hitsMax
    target ?= sourcePos.findClosestByPath(FIND_STRUCTURES, {filter: (s)-> Utils.needsRepair(s) && (Utils.ownedByMe(s) || s.structureType == STRUCTURE_WALL || s.structureType == s.ROAD) })
    creep.memory.repairTargetId = target.id if target
    return if target and Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), target)
    return if Roles.Build(creep, targetFlag)
    return if Roles.Upgrade(creep, targetFlag)
    moveTo(creep, Game.flags.WP1)

  @Build: (creep, targetFlag=null) ->
    targetFlag ||= Game.flags.BuildHere
    if targetFlag? and targetFlag.color != 'red'
        sourcePos = targetFlag
      else 
        sourcePos = creep
    if sourcePos.pos.roomName != creep.pos.roomName
      return Game.wp.move(creep, -> sourcePos)

    target = Game.getObjectById(creep.memory.buildTargetId) unless Game.flags.ClearTarget?.color == 'red'
    target ?= sourcePos.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
    creep.memory.buildTargetId = target.id if target
    if target
      return Roles.Deliver(creep, Utils.nearestEnergyProvider(creep), target)

  @Deliver: (creep, from, to) ->
    new Deliverator(creep, from, to).loop()
    true

  @ClaimBot: (creep, targetFlag) ->
    if (targetFlag.room?.controller?.owner and targetFlag.room.controller.owner.username == creep.owner.username)
      return @FlagMiner(creep, targetFlag, targetFlag.room.controller)

    if targetFlag.pos.roomName != creep.pos.roomName || !creep.pos.inRangeTo(targetFlag, 5)
      err = Game.wp.move(creep, ->targetFlag)
      return
    if creep.pos.inRangeTo(targetFlag, 2)
      # Don't imprint unti lyou get close enough
      if !creep.memory.controllerId
        creep.memory.controllerId = targetFlag.room.controller.id if targetFlag.room?.controller?
    else
      Game.wp.move(creep, ->targetFlag)
      return

    if creep.memory.controllerId
      controller = Game.getObjectById(creep.memory.controllerId)

    if !creep.pos.isNearTo(controller)
      Game.wp.move(creep, -> controller)
    else
      if targetFlag.name.indexOf("Claim") > -1
        creep.claimController(controller)
      else
        creep.reserveController(controller)


  @FlagMiner: (creep, targetFlag, targetDump) -> 
    if creep.carry.energy == creep.carryCapacity
      targetDump ||= primaryStorage
      return Roles.Deliver(creep, null, targetDump)
  
    index = creep.index()
    targetFlag ?= Config.MineFlags[index % Config.MineFlags.length]

    if targetFlag.pos.roomName != creep.pos.roomName || !creep.pos.inRangeTo(targetFlag, 5)
      err = Game.wp.move(creep, -> targetFlag)
      creep.log("flag miner error = #{err}") if err != 0
      return

    if creep.pos.inRangeTo(targetFlag, 2)
      # Don't imporint unti lyou get close enough
      if !creep.memory.sourceId
        creep.memory.sourceId = new PathUtils(targetFlag).sortByDistance(targetFlag.room.find(FIND_SOURCES))[0].id
    else
      Game.wp.move(creep, -> targetFlag)
      return

    if creep.memory.sourceId
      source = Game.getObjectById(creep.memory.sourceId)

    if !creep.pos.isNearTo(source)
      Game.wp.move(creep, ->source)

    target = targetFlag.pos.findClosestByPath(FIND_DROPPED_ENERGY)
    if creep.pickup(creep.pos.findClosestByPath(FIND_DROPPED_ENERGY)) == 0
      return


    err = creep.harvest(source)
    if [-2, -7].indexOf(err) > -1
      delete creep.memory.sourceId

  @MegaMiner: (creep, targetFlag) ->
    if !creep.pos.inRangeTo(targetFlag, 5)
      Game.wp.move(creep, -> targetFlag)
      return
    if !creep.memory.sourceId
      creep.memory.sourceId = targetFlag.pos.findClosestByPath(FIND_SOURCES).id
    if creep.memory.sourceId
      source = Game.getObjectById(creep.memory.sourceId)

    if !creep.pos.isNearTo(source)
      Game.wp.move(creep, -> source)

    err = creep.harvest(source)
    if [-2, -7].indexOf(err) > -1
      delete creep.memory.sourceId

  @Invade: (creep, targetFlag) ->
    if targetFlag.pos.roomName != creep.pos.roomName || !creep.pos.inRangeTo(targetFlag.pos, 5)
      err = moveTo(creep, targetFlag, {reusePath:40, ignoreCreeps:true})
      creep.log "Move error", err if err < 0
      return

    findTargetCreep = (creep, pos) ->
      if creep.canHeal()
        target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {fitler: (c) -> c.hits < c.hitsMax/2  })
        target ?= creep.pos.findClosestByPath(FIND_MY_CREEPS, {fitler: (c) -> c.hits < c.hitsMax  })
      if creep.canAttack() || creep.canShoot()
        target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {fitler: (c) -> c.canAttack() || c.canHeal() || c.canShoot() })
        target ?= creep.pos.findClosestByPath(FIND_HOSTILE_SPAWNS, {fitler: (c) -> c.canAttack() || c.canHeal() || c.canShoot() })
        target ?= creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES) #, {fitler: (c) -> c.canAttack() || c.canHeal() || c.canShoot() })
        target ?= creep.pos.findClosestByPath(FIND_STRUCTURES, {fitler: (c) -> c.structureType == STRUCTURE_WALL })
        # TODO: Prefer healers / ranged attacked, based on some heuristic


    target = findTargetCreep(creep, targetFlag.pos)
    if !target
      return creep.moveTo(targetFlag)

    if creep.canShoot() and creep.pos.inRangeTo(target, 3)
      # don't move
    else
      creep.moveTo(target, {ignoreDestructibleStructures:true})

    if creep.canHeal() and Utils.isAlly(target)
      if creep.pos.isNearTo(target.pos)
        creep.heal(target)
      else
        creep.rangedHeal(target)

    if creep.canAttack() and Utils.isEnemy(target)
      if creep.pos.isNearTo(target.pos)
        creep.attack(target)
    if creep.canShoot() and Utils.isEnemy(target)
      creep.rangedAttack(target)

  @MineTransporter = (creep, targetFlag, targetDump=null) ->
    if creep.carry.energy == creep.carryCapacity
      targetDump ||= primaryStorage
      return Roles.Deliver(creep, null, targetDump)

    target = targetFlag.pos.findClosestByRange(FIND_DROPPED_ENERGY)
    return unless target
    if creep.pos.isNearTo(target)
      creep.pickup(target)
    else
      Game.wp.move(creep, -> target)
    
  
module.exports = Roles
