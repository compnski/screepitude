var harvester = require('harvester');
var guard = require('guard');
var transporter = require('transporter');
var transporterupgrade = require('transporterupgrade');
var mining = require('mining');
var utils = require('utils')

module.exports.loop = function () {
    var miningBases = [
        // new mining.MiningBase('1a', Game.spawns.Spawn1.room.find(FIND_SOURCES)[0], 2),
        new mining.MiningBase('1b', Game.spawns.Spawn1.room.find(FIND_SOURCES)[1], 5)     
    ]
    
    for (var miningBaseIndex in miningBases) {
        var miningBase = miningBases[miningBaseIndex];
        miningBase.recruitMiners()
        miningBase.mine()
    }

    function findRole(role) {
        return utils.findCreepByMemory('role', role)
    }
    
    function spawnAtCapacity() {
        return Game.spawns.Spawn1.energy == Game.spawns.Spawn1.energyCapacity
    }

    // var employment = {
    //     harvester: 0,
    //     miner: 4,
    //     transporter: 1,
    //     transporterupgrader: 2,
    //     upgrader: 3,
    //     builder: 1,
    // }
    
    var employment = {
        guard: 3,
        harvester: 3,
        transporter: 1,
        upgrader: 5,    
        transporterupgrader: 6,
        miner: 5,
        scout: 3,
        // builder: 2,
    }

    if (findRole('harvester').length < employment['harvester']) {
        // console.log('build harvester')
        var name = ('Harvester ' + Math.round(Math.random() * 1000));
        Game.spawns.Spawn1.createCreep([WORK, WORK, MOVE, CARRY], name, {role: 'harvester'})
    } else if (findRole('guard').length < employment['guard']) {
        console.log('oh shit make guards')
        // console.log('build miner')
        var name = ('Guard ' + Math.round(Math.random() * 1000));
        Game.spawns.Spawn1.createCreep([TOUGH, TOUGH, TOUGH, TOUGH, ATTACK, ATTACK, MOVE, MOVE, MOVE], name, {role: 'guard'})
    } else if (findRole('miner').length < employment['miner']) {
        // console.log('build miner')
        var name = ('Miner ' + Math.round(Math.random() * 1000));
        Game.spawns.Spawn1.createCreep([WORK, WORK, MOVE, CARRY, MOVE, CARRY], name, {role: 'miner'})
    } else {        
        if (findRole('scout').length < employment['scout']) {
            // console.log('build transporter')
            var name = ('Scout ' + Math.round(Math.random() * 1000));
            Game.spawns.Spawn1.createCreep([MOVE, MOVE, WORK, CARRY], name, {role: 'scout'})
        }
        
        if (findRole('transporter').length < employment['transporter']) {
            // console.log('build transporter')
            var name = ('Transporter ' + Math.round(Math.random() * 1000));
            Game.spawns.Spawn1.createCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], name, {role: 'transporter'})
        }
        
        if (findRole('transporterupgrader').length < employment['transporterupgrader']) {
            var name = ('TransporterUpgrader ' + Math.round(Math.random() * 1000));
            Game.spawns.Spawn1.createCreep([MOVE, MOVE, MOVE, CARRY, CARRY, CARRY], name, {role: 'transporterupgrader'})
        }
    
        if (findRole('upgrader').length < employment['upgrader']) {
            var name = ('Upgrader ' + Math.round(Math.random() * 1000));
            Game.spawns.Spawn1.createCreep([WORK, WORK, WORK, MOVE, MOVE, CARRY], name, {role: 'upgrader'})
        }
        
        if (findRole('builder').length < employment['builder']) {
            var name = ('Builder ' + Math.round(Math.random() * 1000));
            Game.spawns.Spawn1.createCreep([WORK, WORK, MOVE, MOVE, CARRY], name, {role: 'builder'})
        }
    }

  for(var name in Game.creeps) {
    var creep = Game.creeps[name];
    
    var roomName = creep.room.name;
    if (creep.memory.role == 'scout') {
      //  console.log(creep.memory.state, creep.carry.energy, creep.carryCapacity)
        if (!creep.memory.state) {
            creep.memory.state = 'collect'
        }
        if (creep.carry.energy == creep.carryCapacity) {
            creep.memory.state = 'dump'
        } else if (creep.carry.energy == 0) {
            creep.memory.state = 'collect'
        }
        if (creep.memory.state == 'collect') {
            if (roomName == 'E19S18') {
                var exit = creep.pos.findClosestByRange(FIND_EXIT_TOP);
                creep.moveTo(exit)
            } else if (roomName == 'E19S17') {
                var sources = creep.room.find(FIND_SOURCES)
                if(creep.harvest(sources[1]) == ERR_NOT_IN_RANGE) {
                  creep.moveTo(sources[1]);
                }
            }
        } else if (creep.memory.state == 'dump') {
            var spawn = Game.spawns.Spawn1
            if(creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
              creep.moveTo(spawn);
            } else {
                spawn.renewCreep(creep);
            }
        }
    }
    if(creep.memory.role == 'guard') {
      guard(creep);
    }
    
    if(creep.memory.role == 'transporter') {
      transporter(creep);
    }
    if(creep.memory.role == 'transporterupgrader') {
      transporterupgrade(creep);
    }
    
    if(creep.memory.role == 'harvester') {
      harvester(creep);
    }

    if(creep.memory.role == 'builder') {
    
      if(Game.spawns.Spawn1.room.energyAvailable >= 300 && creep.carry.energy == 0) {
        if(Game.spawns.Spawn1.transferEnergy(creep) == ERR_NOT_IN_RANGE) {
          creep.moveTo(Game.spawns.Spawn1);       
        }
      }
      else {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        if(targets.length) {
          if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0]);         
          }
        }
      }
    }

    if(creep.memory.role == 'guard') {
          var targets = creep.room.find(FIND_HOSTILE_CREEPS);
          if(targets.length) {
            if(creep.attack(targets[0]) == ERR_NOT_IN_RANGE) {
              creep.moveTo(targets[0]);   
            }
          }
        }
        
        function samePos(pos1, pos2) {
            return pos1.x == pos2.x && pos1.y == pos2.y;
        } 

    if(creep.memory.role == 'upgrader') {
        var result = creep.upgradeController(creep.room.controller)
        if (result == ERR_NOT_IN_RANGE || result == ERR_NOT_ENOUGH_RESOURCES) {
            res = creep.moveTo(creep.room.controller)
        }
    }
  }
}