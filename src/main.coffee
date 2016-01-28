Agent = require('agent')
Mine = require('mine')
Deliverator = require('deliverator')
Upgrader = require('upgrader')
Room = require('room')
Builder = require('builder')

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room

targetCounts = 
	repair: 1
	source2: 5
	harvester: 5
	builder: 1
	upgrader: 2
	
room = new Room(primaryRoom, targetCounts)
room.loop()
harvestOnly = room.spawnFailed
for name, creep of Game.creeps
	agent = switch creep.memory.role.split(":")[0]
		when 'upgrader' and not harvestOnly then new Upgrader(creep)
		when 'builder' and not harvestOnly then new Builder(creep)
		when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> primarySpawn))
		when 'repair' then new Deliverator(creep, (-> primarySpawn), (-> primaryRoom.find(FIND_STRUCTURES).filter((s)->s.hits < s.hitsMax )[0]))
		else agent = new Agent(creep)
	agent.loop()


mines = Mine.allInRoom(primaryRoom)
for mine in mines
  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')

