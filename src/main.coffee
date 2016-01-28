Agent = require('agent')
Mine = require('mine')
Deliverator = require('deliverator')
Upgrader = require('upgrader')
Room = require('room')
Builder = require('builder')

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room

for name, creep of Game.creeps
	agent = switch creep.memory.role.split(":")[0]
		when 'upgrader' then new Upgrader(creep)
		when 'builder' then new Builder(creep)
		when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> primarySpawn))
		else agent = new Agent(creep)
	agent.loop()


mines = Mine.allInRoom(primaryRoom)
for mine in mines
  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')


targetCounts = 
	harvester: 5
	upgrader: 2
	builder: 1
	source2: 5
new Room(primaryRoom, targetCounts).loop()