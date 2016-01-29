Agent = require('agent')
Mine = require('mine')
Deliverator = require('deliverator')
Upgrader = require('upgrader')
Cell = require('cell')
Builder = require('builder')
Guard = require('guard')
MegaMiner = require('mega_miner')
Config = require('config')
PathUtils = require('path_utils')

Array.prototype.sum = ->
  return 0 unless @length
  @.reduce((a,b) -> a+b)

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room

targetCounts = 
  source1:2
  transporter:5
  source2: 4
  mega_miner: 3
  mega_miner2: 0
  repair: 4
  builder: 2
  upgrader: 3
  guard: 3

try 
  if primaryRoom.find(FIND_HOSTILE_CREEPS).length > 0
    targetCounts["guard"] = 10
    Game.notify("Active BattleMode!! #{primaryRoom.find(FIND_HOSTILE_CREEPS).length} hostile creeps in base!!")

  cell = new Cell(primaryRoom, targetCounts)
  cell.loop()
  harvestOnly = cell.spawnFailed


  mines = Mine.allInRoom(primaryRoom)
  for mine in mines
    console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')
catch e
  throw e if Config.ThrowExceptions
  console.log("Caught exception! #{e}")

for name, creep of Game.creeps
  try
    switch creep.memory.role.split(":")[0]
      when 'guard' then new Guard(creep).loop()
      when 'mega_miner' then new MegaMiner(creep, mines[0].source).loop()
      when 'mega_miner2' then new MegaMiner(creep, mines[1].source).loop()
      when 'upgrader' then new Upgrader(creep).loop() unless Config.NoUpgrades
      when 'builder' then new Builder(creep).loop() unless Config.NoBuilders
      when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'transporter' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'source1' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
#      when 'source1' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[0]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'repair'
        ((new Deliverator(creep, 
          (-> primarySpawn), 
          (-> primaryRoom.find(FIND_STRUCTURES).filter((s)->s.hits < s.hitsMax )[0])).loop() unless Config.NoRepairs  ) || 
         (new Builder(creep).loop() unless Config.NoBuilders))
  catch e
    throw e if Config.ThrowExceptions
    console.log("Caught exception! #{e}")