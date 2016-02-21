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
    pos: RoomPosition
    id: string
}

interface EnergyHolder extends Structure {
    energy: number;
    energyCapacity: number;
}

class Job {
    name: string;
    start: PositionEntity;
    end: PositionEntity;
    jobFunc: JobFunc;
    candidateFilter: CreepFilter;
    candidateCmp: CreepCmp;
    creep: Screep; // Set during executiong


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

        this.start = opts['start']
        this.end = opts['end']
        this.jobFunc = opts['jobFunc']
        this.candidateFilter = opts['candidateFilter']
        this.candidateCmp = opts['candidateCmp']
    }

    toJSON() {
        var jobFn: any = this.jobFunc;
        var filterFn: any = this.candidateFilter;
        var cmpFn: any = this.candidateCmp;
        console.log(this.start, this.name)
        var ret = {
            name: this.name,
            start: this.start.id,
            jobFunc: RolesReverse[jobFn],
            candidateFilter: FiltersReverse[filterFn],
            candidateCmp: CmpReverse[cmpFn]
        };
        if (this.end != undefined) {
            ret['end'] = this.end.id;
        }
        console.log(JSON.stringify(ret))
        return ret
    }
}

var parseJob = (k: string, v): any => {
    console.log("Parse: ", k, "   ", JSON.stringify(v))
    switch (k) {
        case 'start':
        case 'end':
            var r = Game.getObjectById(v)
            if (r == undefined) {
                console.log("FAILED TO LOAD " + k + " from " + v)
            }
            return r;
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

var getMyStructuresInAllRooms = (structTypes: string[]): Structure[] => {
    var structs = []
    for (var roomName of Object.keys(Game.rooms)) {
        structs.push.apply(getMyStructuresInRoom(roomName, structTypes))
    }
    return structs;
}

var needsEnergy = (s: Structure): boolean => {
    switch (s.structureType) {
        case STRUCTURE_STORAGE:
            return (<Storage>s).store.energy < (<Storage>s).storeCapacity;
        case STRUCTURE_TOWER:
            return (<Tower>s).energy < (<Tower>s).energyCapacity * .75
        case STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN:
            return (<EnergyHolder>s).energy < (<EnergyHolder>s).energyCapacity
    }
    return false
}

var getMyStructuresInRoom = (roomName: string, structTypes: string[]): Structure[] => {
    var room: Room = Game.rooms[roomName]
    if (room == undefined) {
        // TODO: Log?
        console.log("Can't find room " + roomName)
        return []
    }
    if (room["my_structures"] == undefined) {
        room["my_structures"] = room.find(FIND_MY_STRUCTURES)
    }
    return room["my_structures"].filter(s=> { return structTypes.indexOf(s.structureType) > -1 })
}

var findNearestStorage = (target: PositionEntity): Structure => {
    var stores = getMyStructuresInRoom(target.pos.roomName, [STRUCTURE_STORAGE]).filter(needsEnergy)
    if (stores.length == 0)
        stores = getMyStructuresInRoom(target.pos.roomName, [STRUCTURE_TOWER]).filter(needsEnergy)
    if (stores.length == 0)
        stores = getMyStructuresInAllRooms([STRUCTURE_STORAGE]).filter(needsEnergy)
    if (stores.length == 0)
        stores = getMyStructuresInAllRooms([STRUCTURE_SPAWN]).filter(needsEnergy)
    return target.pos.findClosestByRange(stores)
}

var createCarryJob = (target: PositionEntity): Job => {

    return new Job({
        namePrefix: 'carry',
        start: target,
        end: findNearestStorage(target),
        jobFunc: Roles['carry'],
        candidateFilter: Filters['carriesAndMoves'],
        candidateCmp: Cmp['carriesTheMost'],
    })
}

var createDeliverJob = (target: PositionEntity): Job => {

    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        jobFunc: Roles['deliver'],
        candidateFilter: Filters['hasEneryAndMoves'],
        candidateCmp: Cmp['noop'],
    })
}

// TODO: API to add jobs, some way to combine in-memory jobs with in-code jobs
// fitness func for candidates based on distance.

// TODO: A way for jobs to be done and get cleared.
var runAllJobs = (staticJobs: Job[], memJobs: Job[]) => {

    var addJob = (job: Job) => {
        memJobs.push(job)
    }

    var jobs = staticJobs.concat(memJobs)

    if (Memory['job_workers'] == undefined) {
        console.log("replacing worker map1!!")
        Memory['job_workers'] = {}
    }
    var creeps: Screep[] = []
    for (var n of Object.keys(Game.creeps)) {
        creeps.push(Game.creeps[n])
    }

    var seenJobs: { [index: string]: boolean } = {}


    for (var job of jobs) {
        // Check for Dupe
        if (seenJobs[job.name]) {
            console.log("DUPLICATE JOB IN LIST!! " + job.name)
        }
        seenJobs[job.name] = true

        var creepName: string = Memory['job_workers'][job.name];
        var creep: Screep;
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
    }

    // Job creators
    var GATHER_THRESHOLD = 200 // TODO: Set based on available creeps
    for (var roomName of Object.keys(Game.rooms)) {
        var room = Game.rooms[roomName]
        var resources = room.find(FIND_DROPPED_RESOURCES)
        var resourcesById: { [index: string]: number } = {}
        for (var job of jobs) {
            if (job.jobFunc == Roles["carry"] && job.start["resourceType"] == RESOURCE_ENERGY) {
                if (resourcesById[job.start.id] == undefined) {
                    resourcesById[job.start.id] = 0;
                }
                if (job.creep != undefined) {
                    resourcesById[job.start.id] += job.creep.carryCapacity - job.creep.carry.energy;
                } else {
                    // Only want one empty job per resource, default to infinity if there are no creeps
                    resourcesById[job.start.id] = Infinity;
                }
            }
        }
        for (var resource of resources) {
            var currentlyAllocatedCapacity = resourcesById[resource.id] || 0;
            if ((resource.amount - currentlyAllocatedCapacity) > GATHER_THRESHOLD) {
                addJob(createCarryJob(resource))
            }
        }
    }


    // Allocate jobs


    var noJob = (c: Screep): boolean => {
        return c.job == undefined
    }

    for (var job of jobs) {
        if (job.creep != undefined) {
            continue;
        }
        //pick new one
        console.log("Need to replace creep for job " + job.name)
        // TODO figure out currying to pass job into cmp function
        console.log(job.candidateFilter)
        var candidates: Screep[] = creeps.filter(noJob).filter(job.candidateFilter).sort(job.candidateCmp)
        if (candidates.length > 0) {
            var creep: Screep = candidates[0];
            console.log("Picked creep for job " + job.name + " got " + creep.name);
            setJob(creep, job);
            // call setJob???
        } else {
            console.log("no candidates for job=" + job.name)
            continue;
        }
    }

    job = null
    for (var creep of creeps) {
        if (creep.job != undefined) {
            creep.log("job=" + creep.job.name)
            creep.job.jobFunc(creep, creep.job)
        } else {
            addJob(createDeliverJob(creep))
            creep.log("Nothing to do")
        }
    }
}


var hasEnergy = (s) => {
    if (s.amount != undefined) {
        return s.amount > 0;
    }

    if (s.store != undefined) {
        return s.store.energy > 0;
    }
    if (s.energy != undefined) {
        return s.energy > 0
    }
    return false
}

var Roles: { [index: string]: JobFunc } = {
    megaMiner: (creep: Screep, job: Job): number => {
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
    },

    deliver: (creep: Screep, job: Job): number => {
        if (!creep.pos.isNearTo(job.start)) {
            creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 })
        } else {
            var err = creep.transferEnergy(<Structure>job.start);
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.start);
            }
        }
        return err
    },

    carry: (creep: Screep, job: Job): number => {

        if (job.start != undefined && creep.carry.energy < creep.carryCapacity && hasEnergy(job.start)) {
            if (!creep.pos.isNearTo(job.start)) {
                creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 })
            } else {
                var err = creep.pickup(<Energy>job.start);
                if (err == ERR_NOT_IN_RANGE) {
                    err = creep.moveTo(job.start);
                }
            }
        } else {
            job.jobFunc = Roles['deliver']
            job.start = job.end
            delete job.end
        }
        return err;
    }
}
var RolesReverse = {}
for (var rn of Object.keys(Roles)) {
    var fn: any = Roles[rn]
    RolesReverse[fn] = rn
}


var Filters: { [index: string]: CreepFilter } = {
    worksAndMoves: (creep: Screep): boolean=> {
        return creep.canWork() && creep.canMove();
    },

    carriesAndMoves: (creep: Screep): boolean => {
        return creep.carryCapacity > creep.carry.energy && creep.canMove();
    },
    hasEneryAndMoves: (creep: Screep): boolean => {
        return creep.carry.energy > 0 && creep.canMove();
    }

}
var FiltersReverse = {}
for (var rn of Object.keys(Filters)) {
    var fn: any = Filters[rn]
    FiltersReverse[fn] = rn
}

var Cmp: { [index: string]: CreepCmp } = {
    worksHard: (a: Screep, b: Screep): number => {
        return b.howManyParts(WORK) - a.howManyParts(WORK)
    },

    carriesTheMost: (a: Screep, b: Screep): number => {
        return (a.carryCapacity - a.carry.energy) - (b.carryCapacity - b.carry.energy)
    },
    noop: (a: Screep, b: Screep): number => {
        return 0;
    }


    // closeToStart: (a:Creep, b:Creep) : number => {
    //     return a.pos.getRangeTo(creep.job.start) - b.pos.getRangeTo(creep.job.start);
    // }
}
var CmpReverse = {}
for (var rn of Object.keys(Cmp)) {
    var fn: any = Cmp[rn];
    CmpReverse[fn] = rn;
};


var staticJobs: Job[] = [new Job({
    name: "mega_miner_1",
    start: Game.flags['Mine_1_1'],
    jobFunc: Roles['megaMiner'],
    candidateFilter: Filters['worksAndMoves'],
    candidateCmp: Cmp['worksHard'],
}), new Job({
    name: "mega_miner_2",
    start: Game.flags['Mine_1_2'],
    jobFunc: Roles['megaMiner'],
    candidateFilter: Filters['worksAndMoves'],
    candidateCmp: Cmp['worksHard'],
})]



var memJobs: Job[] = [];
try {
    memJobs = JSON.parse(Memory["jobs"], parseJob)
} catch (ex) {
    console.log("Error parsing in memory jobs!: " + ex + "\n  " + Memory["jobs"])
    console.log(ex.stack)
}




var preJobTs = Game.cpu.getUsed()
runAllJobs(staticJobs, memJobs)
var postJobTs = Game.cpu.getUsed()

Memory["jobs"] = JSON.stringify(memJobs)
//console.log(postJobTs - preJobTs)

// console.log(JSON.stringify(jobs))
// console.log(

//var jobs:Job[] = []



Game.Roles = Roles