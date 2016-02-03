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
      when "small_transporter"
        @makeRole(carry:2, move:1)
      when "source1", "source2"
        @makeRole(work: 1, carry: 1, move: 1)
      when "upgrader"
        @makeRole(work: 10, carry: 2, move: 6)
      when "transporter"
        @makeRole(carry: 6, move: 3)
      when "room2_transporter"
        @makeRole(carry: 9, move: 3)
      when "guard"
        @makeRole(tough:3, move:2, attack:3)
      when "hunter_killer","hunter_killer_2"
        @makeRole(tough:10, move:6, attack:4)
      when "healbot","healbot_2"
        @makeRole(tough:10, heal:1, move:3)
      when "builder", "repair"
        @makeRole(work:6, carry:4, move:5)
      when "far_builder"
        @makeRole(work:4, carry:6, move: 5)
      when "mega_miner", "mega_miner2"
        MegaMiner.bodyParts(@)
      when "room2_mega_miner", "room2_mega_miner2"
        MegaMiner.bodyParts(@).concat([MOVE])
      when 'upgrader_filler'
        @makeRole(carry:6, move:3)
      else
        if role.startsWith("position_miner")
          if role.indexOf("transport") == -1 # Miner
            MegaMiner.bodyParts(@).concat([MOVE, MOVE])
          else # Transporter
            @makeRole(carry: 12, move: 10)
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

  # Returns true if the creep was spawned or we can spawn but dont have enough energy
  # Returns false only if the capacity is too low or definition is bad
  spawn: (spawnFrom, role) ->
    name = @nameForRole(role)
    parts = @partsForRole(role)
    memory = @memoryForRole(role)
    partsCost = @partsCost(parts)
    if partsCost > @spawnEnergyCapacity()
      console.log("Can't spawn #{role} due to max capacity -- have #{@spawnEnergyCapacity()}/#{partsCost}")
      return false
    ret = spawnFrom.createCreep(parts, name, memory)
    if ret == ERR_NOT_ENOUGH_RESOURCES
      console.log("Can't spawn #{role} due to resources -- have #{@spawnEnergy()}/#{partsCost}")
      @spawnFailed = true
      return true
    else if ret < 0
      console.log("Can't spawn #{role} due to other error: #{err} -- have #{@spawnEnergy()}/#{partsCost}")
      return false
    else
      console.log("Spawning #{role} named #{name} from #{spawnFrom.name} with #{parts} and #{JSON.stringify(memory)}, got #{ret}")
    true

  loop: ->
    spawn = Game.spawns.Spawn1
    return if Game.cpu.bucket < 1500
    return if spawn.spawning
    creepCount = {}
    numCreeps = 0
    for _, creep of Game.creeps
      continue if creep.ticksToLive < 150
      creepCount[creep.memory.role] ||= 0
      creepCount[creep.memory.role]++ 
      numCreeps++

    if numCreeps < 5
      Game.notify("EMERGENCY: CreepCount low: #{JSON.stringify(creepCount)}")
      @targetCounts['small_transporter'] = 1
      @targetCounts['source1'] = 2
      @targetCounts['source2'] = 2


    console.log("\n")
    console.log(JSON.stringify(creepCount))
    if not spawn.spawning
      for role, targetCount of @targetCounts
        if (creepCount[role]||0) < targetCount
          if @spawn(spawn, role)
            break


module.exports = Cell