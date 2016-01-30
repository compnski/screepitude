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
Healbot = require('healbot')
HunterKiller = require('hunter_killer')


Array.prototype.sum = ->
  return 0 unless @length
  @.reduce((a,b) -> a+b)

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
room2 = Game.flags.Room2.room
primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == 'tower')[0]

targetCounts = 
  source1:0
  tower_filler: 1
  transporter:6
  source2: 0
  mega_miner: 2
  room2_mega_miner: 1
  room2_mega_miner2: 1
  room2_transporter: 8
  mega_miner2: 2
  repair: 2
  builder: 1
  upgrader: 3
  upgrader_filler: 2
  guard: 3
  healbot: 2
  hunter_killer:2

try 
  if (1 for a of primaryRoom.find(FIND_HOSTILE_CREEPS)).length > 0
    console.log("Under Attack")
    targetCounts["guard"] = 10
    Game.notify("Active BattleMode!! #{primaryRoom.find(FIND_HOSTILE_CREEPS).length} hostile creeps in base!!")
    try
      if Game.flags.HuntersMark.room.name != primaryRoom.name
        Game.flags.HuntersMark.setPosition(primarySpawn.pos)
    catch e
      throw e
      Game.notify("Failed to move flag!", 20)
    
    try 
      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))
      primaryTower.attack(nearestTarget) if nearestTarget?
    catch e
      console.log("Failed to use tower!!!")
      Game.notify("Failed to use tower!!!",20)
  else
    # PEACE
    try
      if Game.flags.HuntersMark.room.name != room2.name
        Game.flags.HuntersMark.setPosition(Game.flags.Room2.pos)
    catch e
      throw e
      Game.notify("Failed to move flag!", 20)
catch
  throw e if Config.ThrowExceptions
  console.log("Caught exception! #{e}")

try
  cell = new Cell(primaryRoom, targetCounts)
  cell.loop()
  harvestOnly = cell.spawnFailed


  mines = Mine.allInRoom(primaryRoom)
  room2mines = Mine.allInRoom(room2)
  #for mine in mines
  #  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')
  #for mine in room2mines
  #  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')

catch e
  throw e if Config.ThrowExceptions
  console.log("Caught exception! #{e}")

upgraders = ->
  u = primaryRoom.find(FIND_MY_CREEPS).filter((c)->c.memory.role == 'upgrader')
  u[parseInt(Math.random()*u.length)]

for name, creep of Game.creeps
  try
    switch creep.memory.role.split(":")[0]
      when 'healbot' then new Healbot(creep).loop(Game.flags.HuntersMark)
      when 'hunter_killer' then new HunterKiller(creep).loop(Game.flags.HuntersMark)
      when 'guard' then new Guard(creep).loop()
      when 'tower_filler' then new Deliverator(creep, (-> primarySpawn), (-> primaryTower )).loop()
      when 'upgrader_filler' then new Deliverator(creep, (-> primarySpawn), ( upgraders )).loop()
      when 'mega_miner' then new MegaMiner(creep, mines[0].source).loop()
      when 'mega_miner2' then new MegaMiner(creep, mines[1].source).loop()
      when 'room2_mega_miner' then new MegaMiner(creep, room2mines[0].source).loop()
      when 'room2_mega_miner2' then new MegaMiner(creep, room2mines[1].source).loop()
      when 'upgrader' then new Upgrader(creep).loop() unless Config.NoUpgrades
      when 'builder' then new Builder(creep).loop() unless Config.NoBuilders
      when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'transporter' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'room2_transporter' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider(room2)), (-> (new PathUtils(creep)).nearestEnergyNeed(primaryRoom) )).loop()
      when 'source1' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
#      when 'source1' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[0]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'repair'
        ((new Deliverator(creep, 
          (-> primarySpawn), 
          (-> (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter((s)->s.hits < s.hitsMax ))[0])).loop() unless Config.NoRepairs  ) || 
         (new Builder(creep).loop() unless Config.NoBuilders))
  catch e
    throw e if Config.ThrowExceptions
    console.log("Caught exception! #{e}")