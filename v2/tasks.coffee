Config = require('config')
primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES)
primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS)
primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS)
primaryTower = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_TOWER)[0] 
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0] || primaryTower || primarySpawn

Creeps = {}
for name, creep of Game.creeps
  Creeps[creep.roleName()] = creep.id


energyOkay = -> 
    (primaryStorage.store.energy || primaryStorage.energy) > 2000

Tasks = [{
     role: "small_transporter",  # needs to be unique, but not meaningful other than spawn limits
     body: {carry:4, move:2},
     action: 'Deliver',
     args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
     count: 1
#     condition: -> !Creeps['big_transporter_1_0']?
  }, {
    role: "tiny_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:1, carry:2, move:2},
    action: 'FlagMiner',
    args: [],
    count: 2,
    condition: -> (primaryStorage.store.energy || primaryStorage.energy) < 500
  }, {
    role: "second_tiny_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:1, carry:2, move:2},
    action: 'FlagMiner',
    args: [Game.flags.Mine_5_1, Game.spawns.Spawn2],
    count: 0,
    spawn: 'Spawn2',
    condition: -> Game.spawns.Spawn2?
  }, {
    role: "mega_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:6, move:3},
    action: 'MegaMiner',
    args: [Game.flags.Mine_1_1],
    count: 1,
  }, {
    role: "mega_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:6, move:3},
    action: 'MegaMiner',
    args: [Game.flags.Mine_1_2],
    count: 1,
  }, {
    role: "builder",
    body: {work:5, carry:7, move:6},
    action: 'Build',
    args: [],
    count:1,
    #condition: -> (!Config.NoRepairs) && energyOkay()
  }, {
    role: "reserverationist"
    body: {claim: 3, move: 4, attack:1},
    action: 'ClaimBot',
    args: [Game.flags.Reserve_E11N8]
    count: 1
  }, {
    role: "dump_truck",
    body: {carry:16, move:8},
    action: 'MineTransporter',
    args: [Game.spawns.Spawn1],
    count: 1,
  }, {
    role: "big_transporter",
    body: {carry:10, move:5},
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1,
  } ,{
     role: "second_transporter",  # needs to be unique, but not meaningful other than spawn limits
     body: {carry:3, move:3},
     action: 'Deliver',
     args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
     count: 1
     spawn: 'Spawn2'
  }, {
    role: "mini_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:4, move:3},
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_1],
    count: 1,
    spawn: 'Spawn2'
  }, {
    role: "second_tiny_builder",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:2, carry:2, move:2},
    action: 'Build',
    args: [Game.flags.Mine_5_1],
    count: 2,
    spawn: 'Spawn2',
    condition: -> Game.spawns.Spawn2?
  }, {
    role: "mega_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:6, move:3},
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_1],
    count: 1,
  }, {
    role: "mega_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:6, move:3},
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_2],
    count: 1,
  }, {
    role: "repair",
    body: {work:10, carry:5, move:5},
    action: 'Repair',
    args: [Game.flags.RepairHere],
    count:1,
    condition: -> (!Config.NoRepairs) && energyOkay()
  }, {
    role: "dump_truck",
    body: {carry:16, move:8},
    action: 'MineTransporter',
    args: [Game.spawns.Spawn2, 'nearestTowerSpawnExtension'],
    count: 1,
  }, {
    role: "small_upgarder",
    body: {work:2, carry:1, move:1},
    action: 'Upgrade',
    args: [Game.spawns.Spawn2]
    count: 1
    spawn: 'Spawn2'
    condition: -> (!Config.NoUpgades)# && energyOkay()
  }, {
    role: "second_upgrader",
    body: {work:12, carry:8, move:10},
    action: 'Upgrade',
    args: [Game.spawns.Spawn2],
    count: 1,
    condition: -> (!Config.NoUpgades) && Game.spawns.Spawn2?
  }, {
    role: "upgrader",
    body: {work:12, carry:8, move:10},
    action: 'Upgrade',
    args: [Game.spawns.Spawn1]
    count: 1
    condition: -> (!Config.NoUpgades)# && energyOkay()
  }, {
    role: "big_transporter",
    body: {carry:10, move:5},
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1,
  }, {
    role: "warrior",
    body: {tough: 10, move:10, attack:5}, #1000
    action: "Invade", # fight attackers/healers and the spawn
    args: [Game.flags.Squad1],
    count: 0,
    condition: -> Game.flags.Squad1? and Game.flags.Squad1.color != "red"
  }, {
    role: "ranger",
    body: {tough: 10, move:8, ranged_attack:4}, #1000
    action: "Invade", # fight attackers/healers and the spawn
    args: [Game.flags.Squad1],
    count: 0,
    condition: -> Game.flags.Squad1? and Game.flags.Squad1.color != "red"
  }, {
    role: "healer",
    body: {tough: 10, move:8, heal:3}, #1000
    action: "Invade", # fight attackers/healers and the spawn
    args: [Game.flags.Squad1],
    count: 0,
    condition: -> Game.flags.Squad1? and Game.flags.Squad1.color != "red"
  }, {
    role: "mega_miner",  # needs to be unique, but not meaningful other than spawn limits
    body: {work:6, move:6},
    action: 'MegaMiner',
    args: [Game.flags.Mine_3_1],
    count: 0,
  }, {
    role: "dump_truck",
    body: {carry:10, move:10},
    action: 'MineTransporter',
    args: [Game.flags.Mine_3_1, primaryStorage]
    count: 0,
  }


]

# OldTasks = [
#   {
#     role: "upgarder",
#     body: {work:8, carry:2, move:5},
#     action: 'CarryStuff',
#     args: [primaryStorage, Game.spawns.Spawn1.room.controller],
#     count: 2
#   }, {
#     role: "builder",
#     body: {work:4, carry:10, move:7},
#     action: 'BuildThings',
#     args: [],
#     count:1,
#   }, {
#     role: "repair",
#     body: {work:6, carry:8, move:7},
#     action: 'RepairThings',
#     args: [],
#     count:1,
#   }, {
#     role: "tower_filler",
#     body: {carry:6, move:3},
#     action: 'CarryStuff',
#     args: [primaryStorage, 'nearestTowerSpawnExtension'],
#     count: 1,
#   }, {
#     role: "big_transporter",
#     body: {carry:6, move:3},
#     action: 'CarryStuff',
#     args: [primaryStorage, 'nearestPrimarySpawnOrExtension'],
#     count: 1,
#   }, {
#     role: "mine_guard",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: [Game.flags.Flag1,7],
#     count: 2,
#   }, {
#     role: "controller_healer",
#     body: {tough: 14, move:7, heal: 4},
#     action: 'HealFlag',
#     args: ['guardFlagByIndex',7],
#     count: 2,
#   }, {
#     role: "miner",
#     body: {work:5, carry:6, move:6},
#     action: 'FlagMiner',
#     args: [],
#     count: 2,
#   }, {
#     role: "mine_ranger",
#     body: {tough: 15, move:11, ranged_attack: 7},
#     action: 'GuardFlag',
#     args: [Game.flags.Flag1,7],
#     count: 2,
#    }, {
#     role: "fodder",
#     body: {tough: 10, move:7, attack: 5},
#     action: 'GuardFlag',
#     args: [Game.flags.Flag1,7],
#     count: 5,
#   }, {
#     role: "mine_guard",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: [Game.flags.Flag1,7],
#     count: 2,
#   }, {
#     role: "miner",
#     body: {work:5, carry:6, move:6},
#     action: 'FlagMiner',
#     args: [],
#     count: 2,
#    }, {
#     role: "mine_ranger",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: [Game.flags.Flag1,7],
#     count: 2,
#    }, {
#     role: "miner",
#     body: {work:5, carry:6, move:6},
#     action: 'FlagMiner',
#     args: [],
#     count: 2,
#   }, {
#     role: "dump_truck",
#     body: {carry:6, move:3},
#     action: 'MineTransporter',
#     args: [primaryStorage],
#     count: 2,
#   }, {
#     role: "controller_guard",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: ['guardFlagByIndex',7],
#     count: 2,
#   }, {
#     role: "upgarder_room2",
#     body: {work:8, carry:2, move:5},
#     action: 'CarryStuff',
#     args: [primaryStorage, Game.flags.Room3.room?.controller],
#     count: 1,
#   }, {
#     role: "controller_healer",
#     body: {tough: 20, move:12, heal: 4},
#     action: 'GuardFlag',
#     args: ['guardFlagByIndex',7],
#     count: 1,
#   }, {
#     role: "miner",
#     body: {work:5, carry:6, move:6},
#     action: 'FlagMiner',
#     args: [],
#     count: 2,
#   }, {
#     role: "dump_truck",
#     body: {carry:6, move:3},
#     action: 'MineTransporter',
#     args: [primaryStorage],
#     count: 2,
#   }, {
#     role: "mine_guard",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: ['mineFlagByIndex',7],
#     count: 2,
#   }, {
#     role: "dump_truck",
#     body: {carry:6, move:3},
#     action: 'MineTransporter',
#     args: [primaryStorage],
#     count: 2,
#    }, {
#     role: "mine_guard",
#     body: {tough: 20, move:15, attack: 10},
#     action: 'GuardFlag',
#     args: ['mineFlagByIndex',7],
#     count: 1,
#   }, {
#     role: "miner",
#     body: {work:5, carry:6, move:6},
#     action: 'FlagMiner',
#     args: [],
#     count: 1,
#   }, {
#     role: "dump_truck",
#     body: {carry:6, move:3},
#     action: 'MineTransporter',
#     args: [primaryStorage],
#     count: 8,
#   }]

module.exports = Tasks