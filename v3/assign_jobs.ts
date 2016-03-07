/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />
/// <reference path="jobs.ts" />
/// <reference path="utils.ts" />

var canDoJobFilter = (creep: Screep): JobFilter => {
  return (job: Job): boolean => {
    for (var neededPart of job.bodyReq) {
      var found = false
      for (var bodyPart of creep.body) {
        if (bodyPart.type == neededPart) {
          found = true
          break
        }
      }
      if (!found) return false;
    }
    return true;
  }
}

var noCreepAssigned = (job: Job): boolean => {
  return job.creep == undefined
}

var sortJobsByRange = (pos: RoomPosition, possibleJobs: Job[]) => {
  var distanceCache = {}
  possibleJobs.sort((a: Job, b: Job)=>{
    if(distanceCache[a.target.id] == undefined) {
      distanceCache[a.target.id] = pos.getRangeTo(a.target) - (a.priority * 20)
    }
    if(distanceCache[b.target.id] == undefined) {
      distanceCache[b.target.id] = pos.getRangeTo(b.target) - (b.priority * 20)
    }
    return distanceCache[a.target.id] - distanceCache[b.target.id]
  })    
}

var findBestJob = (creep: Screep, jobs: Job[]): Job => {
  var possibleJobs: Job[] = (jobs
    .filter(noCreepAssigned)
    .filter(targetInSameOrNewRoom(creep.pos.roomName))
    .filter(canDoJobFilter(creep)))
    // TODO: If job requires energy, take that in to account when sorting
    sortJobsByRange(creep.pos, possibleJobs)
    // TODO: sort by body-fit
    // TODO: sort by current energy level
    if (possibleJobs.length > 0) {
      return possibleJobs[0]
    }
    return null
  }

  var assignAllJobs = (creeps: Screep[], jobs: Job[]) => {
    creeps.sort((a:Creep,b:Creep):number=> {return b.body.length - a.body.length})
    for (var creep of creeps) {
      if (creep.spawning) continue;
      if(!e(creep.job) || !e(creep.job.target)) {
        if (!e(creep.job)) {
          clearJob(creep, creep.job)
        }
        var job: Job = findBestJob(creep, jobs)
        if (e(job)) {
          creep.memory = {}
          setJob(creep, job)
        }
      }
    }
  }
