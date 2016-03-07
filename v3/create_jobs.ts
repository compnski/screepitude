/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />
/// <reference path="jobs.ts" />
/// <reference path="utils.ts" />




var newFillJob = (target: PositionEntity, priority: Priority = Priority.NORMAL): Job => {
  return new Job({
    namePrefix: 'fill',
    target: target,
    jobFunc: Roles['fillStruct'],
    bodyReq: [MOVE, CARRY, CARRY],
    priority: priority,
  })
}

var newBuildJob = (target: PositionEntity): Job => {
  return new Job({
    namePrefix: 'build',
    target: target,
    jobFunc: Roles['fillStruct'],
    bodyReq: [MOVE, MOVE, WORK, CARRY],
  })
}

var newUpgradeJob = (target: PositionEntity): Job => {
  return new Job({
    namePrefix: 'upgrade',
    target: target,
    jobFunc: Roles['fillStruct'],
    bodyReq: [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
  })
}

var newRepairJob = (target: PositionEntity): Job => {
  return new Job({
    namePrefix: 'repair',
    target: target,
    jobFunc: Roles['repair'],
    bodyReq: [MOVE, WORK, CARRY],
  })
}

var newMinerJob = (target: PositionEntity): Job => {
  return new Job({
    namePrefix: "miner",
    target: target,
    jobFunc: Roles['megaMiner'],
    bodyReq: [WORK, WORK, MOVE],
    priority: Priority.HIGH,
  })
}
////////////////////////////////////////////////////////
////////////////////////////////////////////////////////

var createJobs = (jobs) => {
  const STRUCTURES_TO_INVESTIGATE = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_CONTROLLER]
  var structures = {}
  for (var roomName of Object.keys(Game.rooms)) {
    var room = Game.rooms[roomName];
    createJobsForRoom(jobs, room)
  }
}

var jobsForTarget = (jobs: Job[], targetId: string): Job[] => {
  return jobs.filter(j=>{
    return j.target != null && j.target.id == targetId
  })
}

var maybeCreateFillJob = (jobs: Job[], struct: Tower|Spawn|Extension|Link) => {
  var filledPercent = struct.energy / struct.energyCapacity;
  switch(struct.structureType) {
    case STRUCTURE_TOWER: 
    if (filledPercent < .8) {
      addJob(newFillJob(struct))
    } else if (filledPercent < .9) {
      addJob(newFillJob(struct, Priority.LOW))
    }
    break;
    default: 
    if (filledPercent < 1) {
      addJob(newFillJob(struct))
    }
  }
}

var createJobsForRoom = (jobs: Job[], room: Room) => {
  room.structures = <Structure[]>room.find(FIND_STRUCTURES)

  createResourceGatheringJobs(jobs, room)
  createFillJobsForRoom(jobs, room)
  createRepairJobsForRoom(jobs, room)
  createConstrutionJobsForRoom(jobs, room)
}

var createFillJobsForRoom = (jobs: Job[], room: Room) => {
  for (var struct of room.structures) {
    if(!ownedByMe(struct)) {
      continue
    }
    var jobsForStruct = jobsForTarget(jobs, struct.id)
    switch (struct.structureType) {
      case STRUCTURE_TOWER: 
      case STRUCTURE_SPAWN: 
      case STRUCTURE_EXTENSION: {
        if (jobsForStruct.length < 1)
          maybeCreateFillJob(jobs, <Tower|Spawn|Extension>struct)
        break
      }
      case STRUCTURE_STORAGE: {
        if (jobsForStruct.length < 5)
          addJob(newFillJob(<Storage>struct, Priority.LOW))
        break
      }
      case STRUCTURE_CONTROLLER: {
        var ctrl = <Controller>struct
        if (room.storage != undefined) {
          if (room.storage.store.energy > 10000) {
            if (jobsForStruct.length < 3)
              addJob(newUpgradeJob(ctrl))
          }
        } else if (ctrl.level < 5) {
          if (jobsForStruct.length < 4)
            addJob(newUpgradeJob(ctrl))
        }
        break
      }
    }
  }
}

var createRepairJobsForRoom = (jobs: Job[], room: Room) => {
  for (var struct of room.structures) {
    if (ownedByMe(struct) && needsRepair(struct)) {
      var jobExists: boolean = false
      for (var j of jobs) {
        if (j.jobFunc == Roles['repair'] && j.target.id == struct.id) {
          jobExists = true
          break
        }
        if (jobExists) {
          break
        }
      }
      if (!jobExists) {
        console.log("Repair site: " + struct.id)
        addJob(newRepairJob(struct))
      }
    }
  }
}

var createConstrutionJobsForRoom = (jobs: Job[],  room: Room) => {
  var roomSites = <ConstructionSite[]>room.find(FIND_MY_CONSTRUCTION_SITES)
  for (var site of roomSites) {
    var jobsForSite: Job[] = jobsForTarget(jobs, site.id)
      // todo only repair walls in myrooms
      // track buildrers on all sites -- maybe a construction foreman so we dont spawn tons of jobs and
      const BUILDERS_PER_SITE = 2
      // builders should depend on remaining energy needed
      if (jobsForSite.length < BUILDERS_PER_SITE) {
        addJob(newBuildJob(site))
      }
    }
  }


var createResourceGatheringJobs = (jobs: Job[], room: Room) => {    // Gather dropped resources
  if (roomControlledByMe(room)) {
    for (var source of <Source[]>room.find(FIND_SOURCES)) {
      if (hasEnergy(source) && jobsForTarget(jobs, source.id).length < 1) {
        addJob(newMinerJob(source))
      }
    }
  }
}
