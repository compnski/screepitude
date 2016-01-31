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


Array.prototype.shuffle = ->
    a = @
    i = a.length
    while --i > 0
        j = ~~(Math.random() * (i + 1))
        t = a[j]
        a[j] = a[i]
        a[i] = t
    a

Array.prototype.sum = ->
  return 0 unless @length
  @.reduce((a,b) -> a+b)

primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
room2 = Game.flags.Room2.room
room2Pos = Game.flags.Room2.pos
room3 = Game.flags.Room3.room
room3Pos = Game.flags.Room3.pos

primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == 'tower')[0]

targetCounts = 
  source1: 0
  source2: 0
  tower_filler: 1
  mega_miner2: 1
  transporter:5
  mega_miner: 1
  repair: 2
  builder: 1
  upgrader: 3
  upgrader_filler: 2
  guard: 3
  healbot: 2
  hunter_killer:2
  healbot_2: 2
  hunter_killer_2:2
  room2_mega_miner2: 1
  room2_transporter: 8
  room2_mega_miner: 1
  position_miner1:1
  position_miner1_transport:3
  position_miner2:1
  position_miner2_transport:3

try 
  if (1 for a of primaryRoom.find(FIND_HOSTILE_CREEPS)).length > 0
    console.log("Under Attack")
    targetCounts["guard"] = 10
    Game.notify("Active BattleMode!! #{primaryRoom.find(FIND_HOSTILE_CREEPS).length} hostile creeps in base!!")
    try
      if Game.flags.HuntersMark.pos.roomName != primaryRoom.pos.roomName
        Game.flags.HuntersMark.setPosition(primarySpawn.pos)
    catch e
      throw e
      Game.notify("Failed to move flag!", 20)
    
    try 
      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))[0]
      primaryTower.attack(nearestTarget) if nearestTarget?
    catch e
      console.log("Failed to use tower!!!")
      Game.notify("Failed to use tower!!!",20)
  else
    # PEACE
    try
      if Game.flags.HuntersMark.pos.roomName != room2Pos.roomName
        Game.flags.HuntersMark.setPosition(room2Pos)
    catch e
      console.log("failed to move flag")
      Game.notify("Failed to move flag!", 20)
      throw e

  if primaryTower.energy > primaryTower.energyCapacity / 2
    nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter((s)-> s.hits < Math.min(s.hitsMax, Config.MaxWallHP)))[0]
    primaryTower.repair(nearestTarget) if nearestTarget?

catch
  console.log("Caught exception! #{e}")
  throw e if Config.ThrowExceptions

try
  cell = new Cell(primaryRoom, targetCounts)
  cell.loop()
  harvestOnly = cell.spawnFailed


  mines = Mine.allInRoom(primaryRoom)
  room2mines = Mine.allInRoom(room2) if room2
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

creepByJob = {}
for name, creep of Game.creeps
  role = creep.memory['role']
  creepByJob[role] ||= []
  creepByJob[role].push(creep)

for creep in (creep for _, creep of Game.creeps).shuffle()
  if Game.flags.ClearTargets?
    delete creep.memory.sourceTarget
    delete creep.memory.deliverTarget
  #console.log 'run', creep.name
  try
    switch creep.memory.role.split(":")[0]
      when 'position_miner1' then new PositionMiner(creep, Game.flags.Mine_3_0?.pos).loop()
      when 'position_miner2' then new PositionMiner(creep, Game.flags.Mine_3_1?.pos).loop()

      when 'position_miner1_transport' then new Deliverator(creep, (-> creepByJob['position_miner1'][0]), (-> primarySpawn)).loop()
      when 'position_miner2_transport' then new Deliverator(creep, (-> creepByJob['position_miner2'][0]), (-> primarySpawn)).loop()

      when 'healbot' then new Healbot(creep).loop(Game.flags.HuntersMark)
      when 'hunter_killer' then new HunterKiller(creep).loop(Game.flags.HuntersMark)

      when 'healbot_2' then new Healbot(creep).loop(Game.flags.HuntersMark2)
      when 'hunter_killer_2' then new HunterKiller(creep).loop(Game.flags.HuntersMark2)

      when 'guard' then new Guard(creep).loop()
      when 'tower_filler'  
        if primaryTower.energy < primaryTower.energyCapacity
          new Deliverator(creep, (-> primarySpawn), (-> primaryTower )).loop()
        else
          new Builder(creep).loop() unless Config.NoBuilders
      when 'upgrader_filler' then new Deliverator(creep, (-> primarySpawn), ( upgraders )).loop()
      when 'mega_miner' then new MegaMiner(creep, mines[0].source).loop()
      when 'mega_miner2' then new MegaMiner(creep, mines[1].source).loop()
      when 'room2_mega_miner' then new MegaMiner(creep, room2mines[0].source).loop() if room2?
      when 'room2_mega_miner2' then new MegaMiner(creep, room2mines[1].source).loop() if room2?
      when 'upgrader' then new Upgrader(creep).loop() unless Config.NoUpgrades
      when 'builder' then new Builder(creep).loop() unless Config.NoBuilders
      when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'transporter' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'room2_transporter' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider(room2)), (-> (new PathUtils(creep)).nearestEnergyNeed(primaryRoom) )).loop()
#      when 'source1' then new Deliverator(creep, (-> (new PathUtils(creep)).nearestEnergyProvider()), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'source1' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[0]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
      when 'repair'
        ((new Deliverator(creep, 
          (-> primarySpawn), 
          (-> (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType != 'rampart' && s.hits < s.hitsMax ))[0])).loop() unless Config.NoRepairs  ) || 
         (new Builder(creep).loop() unless Config.NoBuilders))
  catch e
    throw e if Config.ThrowExceptions
    console.log("Caught exception! #{e}")