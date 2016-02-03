



primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryStorage = primaryRoom.find(FIND_MY_STRUCTURES).filter((s)->s.structureType == STRUCTURE_STORAGE)[0]

  #  Task = {body, class, role, args, condition, priority, count, generatedRoleName}



      
main = ->
  primarySpawnOrExtension = ->
    # TODO: Cache
    primaryRoom.find(FIND_MY_STRUCTURES).filter((c) -> 
      (c.structureType == 'extension' || c.structureType == 'spawn') && c.energy < c.energyCapacity)

  nearestPrimarySpawnOrExtension = (creep) ->
    targets = new PathUtils(creep).sortByDistance(primarySpawnOrExtension())
    targets[0]

  CarryStuff = (from, to) ->
  # if arg is function, then call it. passing in the creep

  tasks = [
    {
      role: "small_transporter", # non-unique, only meaningful if coded for
      body: {carry:2, move:1},
      action: CarryStuff,
      args: [primaryStorage, nearestPrimarySpawnOrExtension],
      count: 1,
      #condition:
    }, {
      role: "upgarder",
      body: {work:8, carry:2, move:5},
      action: CarryStuff,
      args: [primaryStorage, primaryRoom.controller],
      count: 2
    }, {
      role: "big_transporter", # non-unique, only meaningful if coded for
      body: {carry:6, move:3},
      action: CarryStuff,
      args: [primaryStorage, nearestPrimarySpawnOrExtension],
      count: 1,
     }, {
      role: "big_transporter", # non-unique, only meaningful if coded for
      body: {carry:6, move:3},
      action: CarryStuff,
      args: [primaryStorage, nearestPrimarySpawnOrExtension],
      count: 1,

    }]


# TODO associate creep w/task
      when "guard"
        @makeRole(tough:3, move:2, attack:3)
      when "hunter_killer","hunter_killer_2"
        @makeRole(tough:10, move:3, attack:4)
      when "healbot","healbot_2"
        @makeRole(tough:10, heal:1, move:3)
      when "builder", "repair"
        @makeRole(work:6, carry:4, move:5)
      when "far_builder"
        @makeRole(work:4, carry:6, move: 5)
      else
        if role.startsWith("position_miner")
          if role.indexOf("transport") == -1 # Miner
            MegaMiner.bodyParts(@).concat([MOVE])    
          else # Transporter
            @makeRole(carry: 12, move: 10)
        else
          [WORK, CARRY, MOVE]



      switch creep.memory.role
        when 'position_miner1' then new PositionMiner(creep, Game.flags.Mine_1_1.pos).loop()
        when 'position_miner2' then new PositionMiner(creep, Game.flags.Mine_1_2.pos).loop()
        when 'position_miner3' then new PositionMiner(creep, Game.flags.Mine_2_2.pos).loop()
        when 'position_miner4' then new PositionMiner(creep, Game.flags.Mine_2_1.pos).loop()
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