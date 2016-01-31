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
      when "source1", "source2"
        @makeRole(work: 2, carry: 1, move: 2)
      when "upgrader"
        @makeRole(work: 6, carry: 2, move: 2)
      when "transporter"
        @makeRole(carry: 6, move: 3)
      when "room2_transporter"
        @makeRole(carry: 9, move: 3)
      when "guard"
        @makeRole(tough:3, move:2, attack:3)
      when "hunter_killer","hunter_killer_2"
        @makeRole(tough:2, attack:3, move:4)
      when "healbot","healbot_2"
        @makeRole(tough:2, heal:1, move:3)
      when "repair"
        @makeRole(work:2, carry:1, move:2)        
      when "builder"
        @makeRole(work:3, carry:2, move:3)
      when "mega_miner", "mega_miner2"
        MegaMiner.bodyParts(@)
      when "room2_mega_miner", "room2_mega_miner2"
        MegaMiner.bodyParts(@).concat([MOVE])
      when 'upgrade_filler'
        @makeRole(carry:3, move:3)
      else
        if role.startsWith("position_miner")
          if role.indexOf("transport") == -1 # Miner
            MegaMiner.bodyParts(@).concat([MOVE])    
          else # Transporter
            @makeRole(carry: 9, move: 3)
        else
          [WORK, CARRY, MOVE]

  makeRole: (partsMap) ->
      parts = []
      for part, count of partsMap
          for i in [0...count]
              parts.push(part)
      return parts
            
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
    numCreeps = 0
    for _, creep of Game.creeps
      continue if creep.ticksToLive < 100
      creepCount[creep.memory.role] ||= 0
      creepCount[creep.memory.role]++ 
      numCreeps++

    if numCreeps < 5
      Game.notify("EMERGENCY: CreepCount low: #{JSON.stringify(creepCount)}")
      targetCounts['source1'] = 2
      targetCounts['source2'] = 2

    console.log("\n")
    console.log(JSON.stringify(creepCount))
    spawn = @room.find(FIND_MY_SPAWNS)[0]
    if not spawn.spawning
      for role, targetCount of @targetCounts
        if (creepCount[role]||0) < targetCount
          @spawn(spawn, role)
          break


module.exports = Cell