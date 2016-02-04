primarySpawn = Game.spawns.Spawn1
primaryRoom = primarySpawn.room
primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES)
primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS)
primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS)
primaryStorage = primaryRoom.my_structures.filter((s)->s.structureType == STRUCTURE_STORAGE)[0]


Tasks = [
  {
    role: "small_transporter",  # needs to be unique, but not meaningful other than spawn limits
    body: {carry:2, move:1},
    action: 'CarryStuff',
    args: [primaryStorage, 'nearestPrimarySpawnOrExtension'],
    count: 1,
    #condition:
  }, {
    role: "upgarder",
    body: {work:8, carry:2, move:5},
    action: 'CarryStuff',
    args: [primaryStorage, Game.spawns.Spawn1.room.controller],
    count: 2
  }, {
    role: "builder",
    body: {work:8, carry:2, move:5},
    action: 'BuildThings',
    args: [],
    count:2,
  }, {
    role: "dump_truck",
    body: {carry:6, move:3},
    action: 'MineTransporter',
    args: [primaryStorage],
    count: 2,
  }, {
    role: "tower_filler",
    body: {carry:6, move:3},
    action: 'CarryStuff',
    args: [primaryStorage, 'nearestTowerSpawnExtension'],
    count: 1,
  }, {
    role: "big_transporter",
    body: {carry:6, move:3},
    action: 'CarryStuff',
    args: [primaryStorage, 'nearestPrimarySpawnOrExtension'],
    count: 1,
  }, {
    role: "controller_healer",
    body: {tough: 14, move:7, heal: 4},
    action: 'HealFlag',
    args: ['guardFlagByIndex',7],
    count: 2,
  }, {
    role: "mine_ranger",
    body: {tough: 15, move:11, ranged_attack: 7},
    action: 'GuardFlag',
    args: [Game.flags.Flag1,7],
    count: 2,
  }, {
    role: "mine_guard",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: [Game.flags.Flag1,7],
    count: 5,
  }, {
    role: "mine_ranger",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: [Game.flags.Flag1,7],
    count: 2,
   }, {
    role: "miner",
    body: {work:5, carry:6, move:6},
    action: 'FlagMiner',
    args: [],
    count: 2,
   }, {
    role: "fodder",
    body: {tough: 10, move:7, attack: 5},
    action: 'GuardFlag',
    args: [Game.flags.Flag1,7],
    count: 5,
  }, {
    role: "mine_guard",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: [Game.flags.Flag1,7],
    count: 5,
   }, {
    role: "miner",
    body: {work:5, carry:6, move:6},
    action: 'FlagMiner',
    args: [],
    count: 2,
  }, {
    role: "dump_truck",
    body: {carry:6, move:3},
    action: 'MineTransporter',
    args: [primaryStorage],
    count: 2,
  }, {
    role: "repair",
    body: {work:6, carry:4, move:5},
    action: 'Repair',
    args: [primaryStorage],
    count: 1,
  }, {
    role: "controller_guard",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: ['guardFlagByIndex',7],
    count: 2,
  }, {
    role: "upgarder_room2",
    body: {work:8, carry:2, move:5},
    action: 'CarryStuff',
    args: [primaryStorage, Game.flags.Room3.room?.controller],
    count: 1,
  }, {
    role: "controller_healer",
    body: {tough: 20, move:12, heal: 4},
    action: 'GuardFlag',
    args: ['guardFlagByIndex',7],
    count: 1,
  }, {
    role: "miner",
    body: {work:5, carry:6, move:6},
    action: 'FlagMiner',
    args: [],
    count: 2,
  }, {
    role: "dump_truck",
    body: {carry:6, move:3},
    action: 'MineTransporter',
    args: [primaryStorage],
    count: 2,
  }, {
    role: "mine_guard",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: ['mineFlagByIndex',7],
    count: 2,
  }, {
    role: "dump_truck",
    body: {carry:6, move:3},
    action: 'MineTransporter',
    args: [primaryStorage],
    count: 2,
   }, {
    role: "mine_guard",
    body: {tough: 20, move:15, attack: 10},
    action: 'GuardFlag',
    args: ['mineFlagByIndex',7],
    count: 1,
  }, {
    role: "miner",
    body: {work:5, carry:6, move:6},
    action: 'FlagMiner',
    args: [],
    count: 1,
  }, {
    role: "dump_truck",
    body: {carry:6, move:3},
    action: 'MineTransporter',
    args: [primaryStorage],
    count: 8,
  }]

module.exports = Tasks