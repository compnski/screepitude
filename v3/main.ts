/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />

//require('globals')

// Object.getOwnPropertyNames(SuperCreep.prototype).forEach(name => {
//   Creep.prototype[name] = SuperCreep.prototype[name]
// })

type JobFunc = (creep: Screep, job: Job) => number;
type CreepFilter = (creep: Screep) => boolean;
type CreepCmp = (a: Creep, b: Screep) => number;



interface PositionEntity {
    pos : RoomPosition
    id : string
}


class Job {
    name: string;
    start: PositionEntity;
    end: PositionEntity;
    jobFunc: JobFunc;
    candidateFilter: CreepFilter;
    candidateCmp: CreepCmp;
    creep: Screep; // Set during executiong


    constructor(opts={}) {
        this.name = opts['name']
        this.start = opts['start']
        this.end = opts['end']
        this.jobFunc = opts['jobFunc']
        this.candidateFilter = opts['candidateFilter']
        this.candidateCmp = opts['candidateCmp']
    }

    toJSON() {
        var jobFn :any = this.jobFunc;
        var filterFn:any = this.candidateFilter;
        var cmpFn:any = this.candidateCmp;
        var ret = {
            name: this.name,
            start: this.start.id,
            jobFunc: RolesReverse[jobFn],
            candidateFilter: FiltersReverse[filterFn],
            candidateCmp: CmpReverse[cmpFn]
            };
         if (this.end != undefined){
             ret['end'] = this.end.id;
         }
         return ret
    }
}

var parseJob = (k :string, v):any => {
    switch (k) {
        case 'start','end':
            return Game.getObjectById(v)
        break;
        case 'jobFunc':
            return Roles[v];
        break;
        case 'candidateFilter':
            return Filters[v];
        break;
        case 'candidateCmp':
            return Cmp[v];
        break;
    }
    return v
}


var setJob = (creep :Screep, job:Job) => {
    Memory['job_workers'][job.name] = creep.name;
    job.creep = creep;
    creep.job = job;
}


var Roles: { [index: string]: JobFunc } = {
    megaMiner: (creep: Screep, job: Job): number => {
        creep.log(job.name)
        var sourceId = creep.memory.sId;

        var source;
        if (sourceId != undefined) {
            source = Game.getObjectById(sourceId);
        }
        if (source == undefined) {
            if (!creep.pos.isNearTo(job.start)) {
                creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 })
            }
            creep.log(job.start)
            source = job.start.pos.findClosestByRange(FIND_SOURCES)
            if (source != undefined) {
                creep.memory.sId = source.id;
            }
        }
       if (source != undefined) {
         var err = creep.harvest(source);
         if (err == ERR_NOT_IN_RANGE) {
             err = creep.moveTo(source);
         } 
       }
       return err;
    }
}
var RolesReverse = {}
for (var rn of Object.keys(Roles)) {
    var fn :any = Roles[rn]
    RolesReverse[fn] = rn
}


var Filters: { [index: string]: CreepFilter } = {
    worksAndMoves: (creep: Screep) => {
        return creep.canWork() && creep.canMove();
    }

}
var FiltersReverse = {}
for (var rn of Object.keys(Filters)) {
    var fn :any = Filters[rn]
    FiltersReverse[fn] = rn
}

var Cmp: { [index: string]: CreepCmp } = {
    worksHard: (a: Screep, b: Screep): number => {
        return b.howManyParts(WORK) - a.howManyParts(WORK)
    },
    // closeToStart: (a:Creep, b:Creep) : number => {
    //     return a.pos.getRangeTo(creep.job.start) - b.pos.getRangeTo(creep.job.start);
    // }
}
var CmpReverse = {}
for (var rn of Object.keys(Cmp)) {
    var fn :any = Cmp[rn];
    CmpReverse[fn] = rn;
};



var jobs: Job[] = [new Job({
    name: "mega_miner_1",
    start: Game.flags['Mine_1_1'],
    jobFunc: Roles['megaMiner'],
    candidateFilter: Filters['worksAndMoves'],
    candidateCmp: Cmp['worksHard'],
}),new Job({
    name: "mega_miner_2",
    start: Game.flags['Mine_1_2'],
    jobFunc: Roles['megaMiner'],
    candidateFilter: Filters['worksAndMoves'],
    candidateCmp: Cmp['worksHard'],
})]


// console.log(JSON.stringify(jobs))
// console.log(JSON.parse(JSON.stringify(jobs[0]),parseJob).jobFunc)

//var jobs:Job[] = []


// TODO: API to add jobs, some way to combine in-memory jobs with in-code jobs
// fitness func for candidates based on distance.

if (Memory['job_workers'] == undefined) {
    console.log("replacing worker map1!!")
    Memory['job_workers'] = {}
}
//: {[index:string]:string}

// : function(Creep):boolean 

//var creeps : {[index:number]:Creep, push(c:Creep),filter(fn) } = []
var creeps:Screep[] = []
for (var n of Object.keys(Game.creeps)) {
    creeps.push(Game.creeps[n])
}

var seenJobs: { [index: string]: boolean } = {}
var emptyJobs:Job[] = []


for (var job of jobs) {
    // Check for Dupe
    if (seenJobs[job.name]) {
        console.log("DUPLICATE JOB IN LIST!! " + job.name)
    }
    seenJobs[job.name] = true

    var creepName :string = Memory['job_workers'][job.name];
    var creep : Screep;
    if (creepName != undefined) {
        creep = Game.creeps[creepName]
        if (creep == undefined) {
            console.log("Bad creep found, replacing: " + JSON.stringify(creep))
            delete Memory['job_workers'][job.name];
            creepName = undefined;
        } else {
            setJob(creep, job);
        }

    }
    if(creepName == undefined) {
        emptyJobs.push(job)
    }
}

var noJob = (c : Screep):boolean => {
    return c.job == undefined
}


for (var job of emptyJobs) {
    //pick new one
    console.log("Need to replace creep for job " + job.name)
    // TODO figure out currying to pass job into cmp function
    // TODO filter out creeps with jobs
    var candidates : Screep[] = creeps.filter(noJob).filter(job.candidateFilter).sort(job.candidateCmp)
    if (candidates.length > 0) {
        var creep : Screep = candidates[0];
        console.log("Picked creep for job " + job.name + " got " + creep.name);
        setJob(creep, job);
        // call setJob???
    } else {
        console.log("no candidates for job=" + job.name)
        continue;
    }
}
 
job = null
for (creep of creeps) {
    if (creep.job != undefined){
        creep.log("job="+creep.job.name)
        creep.job.jobFunc(creep, creep.job)
    } else {
        creep.log("Nothing to do")
    }
}

Game.Roles = Roles