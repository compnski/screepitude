var Config, Creeps, Tasks, creep, energyOkay, name, primaryRoom, primarySpawn, primaryStorage, primaryTower, ref;

Config = require('config');

primarySpawn = Game.spawns.Spawn1;

primaryRoom = primarySpawn.room;

primaryRoom.my_structures = primaryRoom.find(FIND_MY_STRUCTURES);

primaryRoom.my_creeps = primaryRoom.find(FIND_MY_CREEPS);

primaryRoom.hostile_creeps = primaryRoom.find(FIND_HOSTILE_CREEPS);

primaryTower = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_TOWER;
})[0];

primaryStorage = primaryRoom.my_structures.filter(function(s) {
  return s.structureType === STRUCTURE_STORAGE;
})[0] || primaryTower || primarySpawn;

Creeps = {};

ref = Game.creeps;
for (name in ref) {
  creep = ref[name];
  Creeps[creep.roleName()] = creep.id;
}

energyOkay = function() {
  return (primaryStorage.store.energy || primaryStorage.energy) > 2000;
};

Tasks = [
  {
    role: "small_transporter",
    body: {
      carry: 4,
      move: 2
    },
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1
  }, {
    role: "tiny_miner",
    body: {
      work: 1,
      carry: 2,
      move: 2
    },
    action: 'FlagMiner',
    args: [],
    count: 2,
    condition: function() {
      return (primaryStorage.store.energy || primaryStorage.energy) < 500;
    }
  }, {
    role: "second_tiny_miner",
    body: {
      work: 1,
      carry: 2,
      move: 2
    },
    action: 'FlagMiner',
    args: [Game.flags.Mine_5_1, Game.spawns.Spawn2],
    count: 0,
    spawn: 'Spawn2',
    condition: function() {
      return Game.spawns.Spawn2 != null;
    }
  }, {
    role: "mega_miner",
    body: {
      work: 6,
      move: 3
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_1_1],
    count: 1
  }, {
    role: "mega_miner",
    body: {
      work: 6,
      move: 3
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_1_2],
    count: 1
  }, {
    role: "builder",
    body: {
      work: 5,
      carry: 7,
      move: 6
    },
    action: 'Build',
    args: [],
    count: 1
  }, {
    role: "reserverationist",
    body: {
      claim: 3,
      move: 4,
      attack: 1
    },
    action: 'ClaimBot',
    args: [Game.flags.Reserve_E11N8],
    count: 1
  }, {
    role: "dump_truck",
    body: {
      carry: 16,
      move: 8
    },
    action: 'MineTransporter',
    args: [Game.spawns.Spawn1],
    count: 1
  }, {
    role: "big_transporter",
    body: {
      carry: 10,
      move: 5
    },
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1
  }, {
    role: "second_transporter",
    body: {
      carry: 3,
      move: 3
    },
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1,
    spawn: 'Spawn2'
  }, {
    role: "mini_miner",
    body: {
      work: 4,
      move: 3
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_1],
    count: 1,
    spawn: 'Spawn2'
  }, {
    role: "second_tiny_builder",
    body: {
      work: 2,
      carry: 2,
      move: 2
    },
    action: 'Build',
    args: [Game.flags.Mine_5_1],
    count: 2,
    spawn: 'Spawn2',
    condition: function() {
      return Game.spawns.Spawn2 != null;
    }
  }, {
    role: "mega_miner",
    body: {
      work: 6,
      move: 3
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_1],
    count: 1
  }, {
    role: "mega_miner",
    body: {
      work: 6,
      move: 3
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_5_2],
    count: 1
  }, {
    role: "repair",
    body: {
      work: 10,
      carry: 5,
      move: 5
    },
    action: 'Repair',
    args: [Game.flags.RepairHere],
    count: 1,
    condition: function() {
      return (!Config.NoRepairs) && energyOkay();
    }
  }, {
    role: "dump_truck",
    body: {
      carry: 16,
      move: 8
    },
    action: 'MineTransporter',
    args: [Game.spawns.Spawn2, 'nearestTowerSpawnExtension'],
    count: 1
  }, {
    role: "small_upgarder",
    body: {
      work: 2,
      carry: 1,
      move: 1
    },
    action: 'Upgrade',
    args: [Game.spawns.Spawn2],
    count: 1,
    spawn: 'Spawn2',
    condition: function() {
      return !Config.NoUpgades;
    }
  }, {
    role: "second_upgrader",
    body: {
      work: 12,
      carry: 8,
      move: 10
    },
    action: 'Upgrade',
    args: [Game.spawns.Spawn2],
    count: 1,
    condition: function() {
      return (!Config.NoUpgades) && (Game.spawns.Spawn2 != null);
    }
  }, {
    role: "upgrader",
    body: {
      work: 12,
      carry: 8,
      move: 10
    },
    action: 'Upgrade',
    args: [Game.spawns.Spawn1],
    count: 1,
    condition: function() {
      return !Config.NoUpgades;
    }
  }, {
    role: "big_transporter",
    body: {
      carry: 10,
      move: 5
    },
    action: 'Deliver',
    args: ['nearestEnergyProvider', 'nearestTowerSpawnExtension'],
    count: 1
  }, {
    role: "warrior",
    body: {
      tough: 10,
      move: 10,
      attack: 5
    },
    action: "Invade",
    args: [Game.flags.Squad1],
    count: 0,
    condition: function() {
      return (Game.flags.Squad1 != null) && Game.flags.Squad1.color !== "red";
    }
  }, {
    role: "ranger",
    body: {
      tough: 10,
      move: 8,
      ranged_attack: 4
    },
    action: "Invade",
    args: [Game.flags.Squad1],
    count: 0,
    condition: function() {
      return (Game.flags.Squad1 != null) && Game.flags.Squad1.color !== "red";
    }
  }, {
    role: "healer",
    body: {
      tough: 10,
      move: 8,
      heal: 3
    },
    action: "Invade",
    args: [Game.flags.Squad1],
    count: 0,
    condition: function() {
      return (Game.flags.Squad1 != null) && Game.flags.Squad1.color !== "red";
    }
  }, {
    role: "mega_miner",
    body: {
      work: 6,
      move: 6
    },
    action: 'MegaMiner',
    args: [Game.flags.Mine_3_1],
    count: 0
  }, {
    role: "dump_truck",
    body: {
      carry: 10,
      move: 10
    },
    action: 'MineTransporter',
    args: [Game.flags.Mine_3_1, primaryStorage],
    count: 0
  }
];

module.exports = Tasks;

//# sourceMappingURL=tasks.js.map
