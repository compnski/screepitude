/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />

const JOB_COMPLETE = 999
const E_CRASH = -99
const ERR_LOW_CPU = -50

enum Priority {LOW=0, NORMAL=1, HIGH=3}

class Job{
    name: string;
    target: Structure | ConstructionSite | Energy | PositionEntity | Source;
    jobFunc: JobFunc;
    creep: Screep; // Set during executiong
    bodyReq: BodyPart[]
    priority: Priority

    constructor(opts = {}) {
        this.name = opts['name']

        var np = opts['namePrefix']
        if (np != undefined) {
            if (Memory["jobCounts"] == undefined)
                Memory["jobCounts"] = {};
            if (Memory["jobCounts"][np] == undefined)
                Memory["jobCounts"][np] = 0;
            Memory["jobCounts"][np] += 1;
            this.name = np + "_" + Memory["jobCounts"][np];
        }

        this.target = opts['target']
        this.jobFunc = opts['jobFunc']
        this.bodyReq = opts['bodyReq']
        this.priority = opts['priority'] || Priority.NORMAL

        if (this.bodyReq == undefined) {
            console.log("Bad job!!, no body " + this.name)
            console.log(opts['bodyReq'])
            throw new Error("Bad job="+this.name)
        }
    }

    toJSON() {
        try{
            var jobFn: any = this.jobFunc;
            var ret = {
                name: this.name,
                target: this.target.id,
                jobFunc: RolesReverse[jobFn],
                bodyReq: this.bodyReq,
                priority: this.priority
            };
            return ret
        } catch(ex) {
            console.log("Error converting struct to json for:  " +  this.name)
            console.log(ex.stack)    
        }
    }
}
var parseJob = (k: string, v): any => {
    switch (k) {
        case 'target': 
        var r = Game.getObjectById(v)
        if (r == undefined) {
            console.log("FAILED TO LOAD " + k + " from " + v)
        }
        return r;
        break;
        case 'jobFunc': 
        return Roles[v];
        break;
        case '': 
        return v.map(o=> { return new Job(o) })
    }
    return v
}

var setJob = (creep: Screep, job: Job) => {
    Memory['job_workers'][job.name] = creep.name;
    job.creep = creep;
    creep.job = job;
}

var clearJob = (creep: Screep, job: Job) => {
    if (job != null  && job != undefined) {
        delete Memory['job_workers'][job.name];
        delete job.creep
    }
    if (e(creep))
        delete creep.job
    removeJob(job)
}

var loadCreepJobs = (jobs: Job[]): { [index: string]: boolean } => {
    var seenJobs: { [index: string]: boolean } = {}
    for (var job of jobs) {
        if (seenJobs[job.name]) {
            console.log("DUPLICATE JOB IN LIST!! " + job.name)
        }
        seenJobs[job.name] = true
        var creepName: string = Memory['job_workers'][job.name];
        var creep: Screep = undefined;
        if (creepName != undefined) {
            creep = Game.creeps[creepName]
            if (job.target == undefined || job.target == null) {
                console.log("Start disappeared for " + job.name)
                clearJob(creep, job)
                continue
            }
        } else {
            if (job.target == undefined || job.target == null) {
                console.log("Start disappeared for " + job.name)
                clearJob(null, job)
                continue
            }
        }
        if (creep == undefined || creep == null) {
            delete Memory['job_workers'][job.name];
        } else {
            setJob(creep, job);
        }
    }
    cleanJobs(jobs, seenJobs)
    return seenJobs
}

var cleanJobs = (jobs: Job[], seenJobs: { [index: string]: boolean }) =>{
    // Clean up job workers
    for (var jobName of Object.keys(Memory['job_workers'])) {
        var creepName: string = Memory['job_workers'][jobName];
        if (seenJobs[jobName] !== true || !e(Game.creeps[creepName])) {
            clearJob(Game.creeps[creepName], job)
        }
    }
    for (var job of jobs) {
        if(!e(job.target)) {
            clearJob(job.creep, job)
        }
    }
}

var runAllJobs = (creeps: Screep[]) => {
    for (var creep of creeps) {
        if (e(creep.job)) {
            var jobName = creep.job.name
            var err = runJob(creep, creep.job)
        } else {
          //creep.log("Nothing to do")
          // TODO: Count # of idle bots, eventually cull weak/old ones
          if (Game.flags['Idle'] != undefined) {
              creep.moveTo(Game.flags['Idle'])
          }
      }
  }
}

var displayName = (s: Structure | ConstructionSite | Energy | PositionEntity):String => {
    return new String(s)
}


var runJob = (creep: Screep, job: Job): number => {
    if(job.priority != Priority.HIGH && cpuOverBudget()) {
        return ERR_LOW_CPU
    }
    var ret
    try {
        ret = creep.job.jobFunc(creep, creep.job)
    } catch (ex) {
        console.log("Crash running job " + creep.job.name + " and msg " + ex)
        console.log(ex.stack)
        ret = E_CRASH
    }
    switch (ret) {
        case JOB_COMPLETE: {
            creep.log("Complete! job=" + job.name + " target=" + displayName(job.target))
            clearJob(creep, creep.job)
        }
        break;
        case ERR_NO_PATH: 
        case E_CRASH: 
        case ERR_NOT_FOUND: 
        case ERR_INVALID_TARGET: 
        case ERR_FULL: 
        case ERR_INVALID_ARGS: 
        case ERR_NOT_OWNER:
        case ERR_NOT_ENOUGH_RESOURCES: 
        creep.log("Failed!! job=" + job.name + " err=" + ret + " target=" + displayName(job.target))
        clearJob(creep, creep.job)
        break
        case 0: 
        case ERR_TIRED: 
        break
        default: 
    }
    return ret
}

const MAX_JOBS = 200
// TODO: API to add jobs, some way to combine in-memory jobs with in-code jobs
// fitness func for candidates based on distance.

var doJobs = (jobs: Job[]) => {
    if (Memory['job_workers'] == undefined) {
        console.log("replacing worker map1!!")
        Memory['job_workers'] = {}
    }
    var creeps: Screep[] = []
    for (var n of Object.keys(Game.creeps)) {
        if (Game.creeps[n].spawning) continue;
        creeps.push(Game.creeps[n])
    }

    loadCreepJobs(jobs)
    assignAllJobs(creeps, jobs)
    runAllJobs(creeps)
    // Look up job linkages from Memory and update Game.creep and jobs variables to have links.
    // TODO: Clean up Memory.creeps
}

var loadJobs = (): Job[] => {
    var jobs: Job[]
    try {
        var jobsJSON = Memory["jobs"];
        if (jobsJSON != undefined) {
            jobs = JSON.parse(jobsJSON, parseJob)
        }
    } catch (ex) {
        console.log("Error parsing in memory jobs!: " + ex + "\n  " + Memory["jobs"])
        console.log(ex.stack)
    }
    return jobs
}

var saveJobs = (jobs: Job[]) => {
    Memory["jobs"] = JSON.stringify(jobs)
}
