Agent = require('agent')
Mine = require('mine')

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room

for name, creep of Game.creeps
  agent = new Agent(creep)
  agent.dumbHarvesting()

mines = Mine.allInRoom(primaryRoom)
for mine in mines
  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')