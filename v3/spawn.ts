/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />
/// <reference path="jobs.ts" />


var MAX_CREEPS_PER_ROOM = 20
var runSpawn = (spawn: Spawn, jobs: Job[]) => {
  var neededCreeps = getNeededCreeps(jobs.filter(targetInSameOrNewRoom(spawn.pos.roomName)))
  var creepsInRoom = spawn.room.find(FIND_MY_CREEPS).length
  if(neededCreeps.length == 0 || creepsInRoom > MAX_CREEPS_PER_ROOM || creepsInRoom > 4 && spawn.room.energyAvailable < spawn.room.energyCapacityAvailable) {
    return
  }
  spawnCreeps(spawn, neededCreeps)
}

var getNeededCreeps = (jobs: Job[]): BodyPart[][] => {
    var neededCreeps: BodyPart[][] = [] //[[WORK,CARRY,MOVE]] //,[CARRY,CARRY,MOVE], [CARRY,CARRY,MOVE], [WORK,WORK,MOVE]];
    for (var job of jobs) {
        if (job.creep == undefined) { // hacky -- add 1 body req per priority
            for(var i=0;i<job.priority;i++) {
                neededCreeps.push(job.bodyReq)
            }
        }
    }
    return neededCreeps
}
//     // TOOD -- do this per-room
//     const MAX_CREEPS = 20
//     if(neededCreeps.length > 0 && creeps.length < MAX_CREEPS) {
//         spawnCreeps(neededCreeps)        
//     }
// }

var getBodyCost = (body: BodyPart[]): number => {
    var cost = 0
    for (var part of body) {
        cost += BODYPART_COST[part]
    }
    return cost
}

var getBodyDefinition = (body: BodyPart[], energyCapacity: number): BodyPart[] => {
    var bodyParts = []
    var cost = getBodyCost(body)
    var bodyCounts = Math.min(Math.floor(energyCapacity / cost), Math.floor(50 / body.length))
    for (var i = 0; i < bodyCounts; i++) {
        Array.prototype.push.apply(bodyParts, body)
    }
    return bodyParts
}


// TODO: Some sort of limits on creeps, maybe reduce chance of spawning duplicate bodies?
var spawnCreeps = (spawn: Spawn, bodyParts: BodyPart[][]) => {
    if (bodyParts.length == 0) return;
    if (spawn.spawning != null) return;
    var idx = Math.floor(Math.random() * bodyParts.length)
    var body = bodyParts[idx]
    var bod = getBodyDefinition(body, spawn.room.energyAvailable)
    if (bod.length == 0) {
        return
    }
    console.log("Want to spawn ", bod)
    var err = spawn.createCreep(bod)
    if (err == 0) {
        bodyParts.splice(idx)
    } else {
        console.log(err)
    }
}
