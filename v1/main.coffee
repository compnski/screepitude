
if Game.cpu.bucket < 1500
  Game.notify("CPU LOW!", 20)
  main = false
startCpu = Game.cpu.getUsed()

main ?= ->

  primarySpawn = Game.spawns.Spawn1
  primaryRoom = primarySpawn.room
  primaryStorage = primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == STRUCTURE_STORAGE)[0]
  room1Pos = Game.flags.Room1.pos
  room2 = Game.flags.Room2.room
  room2Pos = Game.flags.Room2.pos
  room3 = Game.flags.Room3.room
  room3Pos = Game.flags.Room3.pos

  room4 = Game.flags.Room4.room
  room4Pos = Game.flags.Room4.pos

  roomNameToPos = {}
  roomNameToPos[room1Pos.roomName] = room1Pos
  roomNameToPos[room2Pos.roomName] = room2Pos
  roomNameToPos[room3Pos.roomName] = room3Pos
  roomNameToPos[room4Pos.roomName] = room4Pos

  Game.roomNameToPos = roomNameToPos

  Agent = require('agent')
  Mine = require('mine')
  Deliverator = require('deliverator')
  #Upgrader = require('upgrader')
  Cell = require('cell')
  Builder = require('builder')
  Guard = require('guard')
  Config = require('config')
  PathUtils = require('path_utils')
  Healbot = require('healbot')
  HunterKiller = require('hunter_killer')

  PositionMiner = require('position_miner')


  #
  #  Task = {body, class, role, args, condition, priority, count, generatedRoleName}
  # 
  # Creates a set of roles based on tasks

  targetCounts = 
    small_transporter: 1
    source1: 0
    source2: 0
    transporter:0
    position_miner1:1
    position_miner1_transport:1
    position_miner2:1
    position_miner2_transport:1


    hunter_killer:2
    healbot: 2

    position_miner3:1
    position_miner4:0
    position_miner3_transport:3
    position_miner4_transport:0
    far_builder: 1

    position_miner5:1
    position_miner5_transport:3
    position_miner6:1
    position_miner6_transport:3

    tower_filler: 1
    transporter:1
    repair: 1 unless Config.NoRepairs
    builder: 1 unless Config.NoBuilders
    upgrader: 4 unless Config.NoUpgrades
    upgrader_filler: 0 unless Config.NoUpgrades
    guard: 3
    hunter_killer_2:2
    healbot_2: 2


  Array.prototype.sum = ->
    return 0 unless @length
    @.reduce((a,b) -> a+b)

  String.prototype.paddingLeft = (paddingValue) ->
     return String(paddingValue + this).slice(-paddingValue.length)

  primaryTower = primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == 'tower')[0]

  loadCpu = Game.cpu.getUsed()
  console.log "Init took #{loadCpu - startCpu}"
  try 
    nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))[0]
    primaryTower.attack(nearestTarget) if nearestTarget?
  catch e
    console.log("Failed to use tower!!!")
    Game.notify("Failed to use tower!!!",20)

  try 
    if (1 for a of primaryRoom.find(FIND_HOSTILE_CREEPS)).length > 0
      console.log("Under Attack")
      targetCounts["guard"] = 10
      Game.notify("Active BattleMode!! #{primaryRoom.find(FIND_HOSTILE_CREEPS).length} hostile creeps in base!!")
      # try
      #   if Game.flags.HuntersMark.pos.roomName != primaryRoom.pos.roomName
      #     Game.flags.HuntersMark.setPosition(primarySpawn.pos)
      # catch e
      #   throw e
      #   Game.notify("Failed to move flag!", 20)
      
      try 
        nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_HOSTILE_CREEPS))[0]
        primaryTower.attack(nearestTarget) if nearestTarget?
      catch e
        console.log("Failed to use tower!!!")
        Game.notify("Failed to use tower!!!",20)


    if primaryTower.energy > primaryTower.energyCapacity / 2
      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_MY_CREEPS).filter((c)->c.hits < c.hitsMax))
      primaryTower.heal(nearestTarget) if nearestTarget?

      nearestTarget = new PathUtils(primaryTower).sortByDistance(primaryRoom.find(FIND_MY_STRUCTURES).filter((s)-> s.hits < Math.min(s.hitsMax, Config.MaxWallHP)))[0]
      primaryTower.repair(nearestTarget) if nearestTarget? #and primaryTower.pos.getRangeTo(nearestTarget) < 5

  catch
    console.log("Caught exception! #{e}")
    throw e if Config.ThrowExceptions


  initCpu = Game.cpu.getUsed()
  console.log "Defense took #{initCpu - loadCpu}"
  if Game.cpu.bucket < 1800
    Game.notify("CPU LOW!", 20)
    return

  try
    cell = new Cell(primaryRoom, targetCounts)
    cell.loop()
    harvestOnly = cell.spawnFailed


    #mines = Mine.allInRoom(primaryRoom)
    #room2mines = Mine.allInRoom(room2) if room2
    #for mine in mines
    #  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')
    #for mine in room2mines
    #  console.log('source', mine.source.id, 'has', mine.capacity(), 'slots for mining')

  catch e
    throw e if Config.ThrowExceptions
    console.log("Caught exception! #{e}")

  cellCpu = Game.cpu.getUsed()
  console.log("Cell took #{cellCpu - initCpu}")
  return if Game.cpu.bucket < 2200 && Game.time % 5 == 0

  upgraders = ->
    u = primaryRoom.find(FIND_MY_CREEPS).filter((c)->c.memory.role == 'upgrader')
    u[parseInt(Math.random()*u.length)]


  creepByJob = {}
  for name, creep of Game.creeps
    role = creep.memory['role']
    creepByJob[role] ||= []
    creepByJob[role].push(creep)
  creepEnergy = 0
  cpuByRole = {}
  #for creep in (creep for _, creep of Game.creeps)#.shuffle()
  for _, creep of Game.creeps
    continue if Game.cpu.bucket < 500
    if Game.flags.ClearTargets?
      delete creep.memory.sourceTarget
      delete creep.memory.deliverTarget
    #console.log 'run', creep.name
    cpuUsed = Game.cpu.getUsed()
    try
      switch creep.memory.role
        when 'position_miner1' then new PositionMiner(creep, Game.flags.Mine_1_1.pos).loop()
        when 'position_miner2' then new PositionMiner(creep, Game.flags.Mine_1_2.pos).loop()
        when 'position_miner3' then new PositionMiner(creep, Game.flags.Mine_4_1.pos).loop()
        #when 'position_miner4' then new PositionMiner(creep, Game.flags.Mine_4_1.pos).loop()
        when 'position_miner5' then new PositionMiner(creep, Game.flags.Mine_3_1.pos).loop()
        when 'position_miner6' then new PositionMiner(creep, Game.flags.Mine_3_2.pos).loop()

        when 'position_miner1_transport' then new Deliverator(creep, (-> creepByJob['position_miner1']?[0]),  -> primaryStorage).loop()
        when 'position_miner2_transport' then new Deliverator(creep, (-> creepByJob['position_miner2']?[0]),  -> primaryStorage).loop()
        when 'position_miner3_transport' then new Deliverator(creep, (-> creepByJob['position_miner3']?[0]),  -> primaryStorage).loop()
        when 'position_miner4_transport' then new Deliverator(creep, (-> creepByJob['position_miner4']?[0]),  -> primaryStorage).loop()
        when 'position_miner5_transport' then new Deliverator(creep, (-> creepByJob['position_miner5']?[0]),  -> primaryStorage).loop()
        when 'position_miner6_transport' then new Deliverator(creep, (-> creepByJob['position_miner6']?[0]),  -> primaryStorage).loop()


        when 'healbot' then new Healbot(creep).loop(Game.flags.HuntersMark)
        when 'hunter_killer' then new HunterKiller(creep).loop(Game.flags.HuntersMark)

        when 'healbot_2' then new Healbot(creep).loop(Game.flags.HuntersMark2)
        when 'hunter_killer_2' then new HunterKiller(creep).loop(Game.flags.HuntersMark2)

        when 'guard' then new Guard(creep).loop()
        when 'tower_filler'  
          if primaryTower.energy < primaryTower.energyCapacity
            new Deliverator(creep, (-> primaryStorage), (-> primaryTower )).loop()
          else
            #new Builder(creep, -> primaryStorage).loop()
            continue
        when !Config.NoUpgrades && 'upgrader_filler' then new Deliverator(creep, (-> primaryStorage), upgraders).loop()
        when 'upgrader' then new Deliverator(creep, (->primaryStorage), (-> creep.room.controller)).loop() unless Config.NoUpgrades
        when !Config.NoBuilders && 'builder' then new Builder(creep, (-> primaryStorage)).loop()
        when !Config.NoBuilders && 'far_builder' then new Builder(creep, null, Game.flags.BuildHere).loop()

        when 'source1' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[0]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
        when 'source2' then new Deliverator(creep, (-> primaryRoom.find(FIND_SOURCES)[1]), (-> (new PathUtils(creep)).nearestEnergyNeed() )).loop()
        when 'transporter' , "small_transporter"
          nearestEnergyNeed = ->
            if creep.pos.roomName != primarySpawn.pos.roomName
              # Return to primary spawn if not there
              return new PathUtils(primarySpawn).nearestEnergyNeed()
            else
              targets = new PathUtils(creep).sortByDistance(creep.room.find(FIND_MY_STRUCTURES).filter((c) -> (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity))
              targets[parseInt(Math.random()*Math.min(targets.length,2))]
          new Deliverator(creep, (-> primaryStorage), nearestEnergyNeed).loop()
        when 'repair'
          new Deliverator(creep, 
            (-> primaryStorage), 
            (-> (new PathUtils(creep)).sortByDistance(primaryRoom.find(FIND_STRUCTURES).filter((s)->s.structureType != 'rampart' && s.hits < Math.min(s.hitsMax, Config.MaxWallHP) ))[0])).loop() unless Config.NoRepairs
           #(new Builder(creep, -> primaryStorage).loop() unless Config.NoBuilders))
        else
          console.log("Orphan bot #{creep.name}")
    catch e
      throw e if Config.ThrowExceptions
      console.log("Caught exception! #{e}")
    finally
      creepEnergy += creep.carry.energy
      cpuByRole[creep.memory.role] ||= 0
      cpuByRole[creep.memory.role] += Game.cpu.getUsed() - cpuUsed
      #console.log "Processed #{creep.name.paddingLeft("                                                ")} \tin #{Math.trunc((Game.cpu.getUsed() - cpuUsed)*1000)} cpu"
  for role, cpu of cpuByRole
    console.log "Processed #{role.paddingLeft("                                                ")} \tin #{Math.trunc((cpu)*1000)} cpu" if cpu > 1
  endCpu = Game.cpu.getUsed()
  console.log('-----')
  console.log("Creeps took #{endCpu - cellCpu}")
  console.log("Total took #{endCpu - startCpu}")
  console.log(" Spawn: #{cell.spawnEnergy()}/#{cell.spawnEnergyCapacity()}\tTower: #{primaryTower.energy}\tCreep: #{creepEnergy}\tStore: #{primaryStorage.store.energy}\tCPU Bucket: #{Game.cpu.bucket}")
  console.log('FIN')

main()