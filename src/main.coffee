Agent = require('agent')
Mine = require('mine')
Deliverator = require('deliverator')
Upgrader = require('upgrader')
Room = require('room')
Builder = require('builder')
Guard = require('guard')

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room

targetCounts = 
  repair: 2
  source2: 7
  harvester: 7
  builder: 2
  upgrader: 3
  guard: 3

if primaryRoom.find(FIND_HOSTILE_CREEPS).length > 0
  targetCounts["guard"] = 10
  Game.notify("Active BattleMode!! #{primaryRoom.find(FIND_HOSTILE_CREEPS).length} hostile creeps in base!!")

room = new Room(primaryRoom, targetCounts)
room.loop()
harvestOnly = room.spawnFailed
for name, creep of Game.creeps
  try
    switch creep.memory.role.split(":")[0]
      when 'guard' then Guard(creep)
      when !harvestOnly && 'upgrader' then new Upgrader(creep).loop()
      when 'builder' then new Builder(creep).loop()
      when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> primarySpawn)).loop()
      when 'repair'
        (new Deliverator(creep, 
          (-> primarySpawn), 
          (-> primaryRoom.find(FIND_STRUCTURES).filter((s)->s.hits < s.hitsMax )[0])).loop() || 
         new Builder(creep).loop())
      else 
        new Agent(creep).loop()
  catch e
    console.log("Caught exception! #{e}")


mines = Mine.allInRoom(primaryRoom)
for mine in mines
  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')

