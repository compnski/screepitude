
class Room
	constructor: (@room, @targetCounts) ->

	nameForRole: (role) ->
		@room.memory.totalCreepCounts ||= {}
		@room.memory.totalCreepCounts[role] ||= 0
		@room.memory.totalCreepCounts[role]++
		return "#{role}_#{@room.memory.totalCreepCounts[role]}"

	partsForRole: (role) ->
		switch role
			when "harvester"
				[WORK, CARRY, MOVE]
			when "upgrader"
				[WORK, WORK, CARRY, MOVE]
			when "guard"
				[TOUGH, TOUGH, TOUGH, TOUGH, MOVE, MOVE, ATTACK, ATTACK]
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
			console.log("Can't spawn #{role} due to resources -- have #{spawnFrom.energy}")
			@spawnFailed = true
		else
			console.log("Spawning #{role} named #{name} from #{spawnFrom.name} with #{parts} and #{JSON.stringify(memory)}, got #{ret}")

	loop: ->
		creepCount = {}
		for creep in @room.find(FIND_MY_CREEPS)
			creepCount[creep.memory.role] ||= 0
			creepCount[creep.memory.role]++ 
		spawn = @room.find(FIND_MY_SPAWNS)[0]
		if not spawn.spawning
			for role, targetCount of @targetCounts
				if (creepCount[role]||0) < targetCount
					@spawn(spawn, role)
					break


module.exports = Room