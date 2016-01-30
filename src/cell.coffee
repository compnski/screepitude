MegaMiner = require('mega_miner')
class Cell
  constructor: (@room, @targetCounts) ->

  nameForRole: (role) ->
    @room.memory.totalCreepCounts ||= {}
    @room.memory.totalCreepCounts[role] ||= 0
    @room.memory.totalCreepCounts[role]++
    return "#{role}_#{@room.memory.totalCreepCounts[role]}"

  spawnEnergyCapacity: ->
    (s.energyCapacity for s in @room.find(FIND_MY_STRUCTURES) when s.structureType == 'extension' || s.structureType == "spawn").sum()

  spawnEnergy: ->
    (s.energy for s in @room.find(FIND_MY_STRUCTURES) when s.structureType == 'extension' || s.structureType == "spawn").sum()

  partsForRole: (role) ->
    switch role
      when "harvester"
        [WORK, CARRY, MOVE]
      when "upgrader"
        [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE]
      when "transporter"
        [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE]
      when "room2_transporter"
        [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
      when "guard"
        [TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK]
      when "hunter_killer"
        [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE]
      when "healbot"
        [TOUGH, TOUGH, TOUGH, HEAL, MOVE, MOVE, MOVE, MOVE]
      when "repair"
        [WORK, WORK, CARRY, MOVE, MOVE]
      when "builder"
        [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]
      when "mega_miner", "mega_miner2", "room2_mega_miner", "room2_mega_miner2"
        MegaMiner.bodyParts(@)
      when 'upgrade_filler'
        [CARRY, CARRY, MOVE, MOVE]
      else
        [WORK, CARRY, MOVE]
            
  memoryForRole: (role) ->
    {"role": role}

  spawn: (spawnFrom, role) ->
    name = @nameForRole(role)
    parts = @partsForRole(role)
    memory = @memoryForRole(role)
    ret = spawnFrom.createCreep(parts, name, memory)
    if ret == ERR_NOT_ENOUGH_RESOURCES
      console.log("Can't spawn #{role} due to resources -- have #{@spawnEnergy()}/#{@spawnEnergyCapacity()}")
      @spawnFailed = true
    else
      console.log("Spawning #{role} named #{name} from #{spawnFrom.name} with #{parts} and #{JSON.stringify(memory)}, got #{ret}")

  loop: ->
    creepCount = {}
    for _, creep of Game.creeps
      continue if creep.ticksToLive < 100
      creepCount[creep.memory.role] ||= 0
      creepCount[creep.memory.role]++ 
    console.log("\n")
    console.log(JSON.stringify(creepCount))
    spawn = @room.find(FIND_MY_SPAWNS)[0]
    if not spawn.spawning
      for role, targetCount of @targetCounts
        if (creepCount[role]||0) < targetCount
          @spawn(spawn, role)
          break


module.exports = Cell