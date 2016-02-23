/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />

//require('globals')

// Object.getOwnPropertyNames(SuperCreep.prototype).forEach(name => {
//   Creep.prototype[name] = SuperCreep.prototype[name]
// })

type JobFunc = (creep: Screep, job: Job) => number;
type CreepFilter = (creep: Screep) => boolean;
type CreepCmp = (a: Creep, b: Screep) => number;


const JOB_COMPLETE = 999
const E_CRASH = -99

interface PositionEntity {
    pos: RoomPosition
    id: string
}

interface EnergyHolder extends Structure {
    energy: number;
    energyCapacity: number;
    transferEnergy(c: Creep)
}

// TODO: re-add candidate filter
// TODO: figure out better idle situation
// TODO: deal with creeps having leftover energy, fix deliver jobs, maybe swap end for 'desired source' or somesuch
// TODO: take creep localicty into account when comparing
// TODO: tower logic
// TODO: builder/ repair logic
// TODO: road creator -- keep map of road positions, pave most traveled unpaved area
// TODO : maximize upgrading!
class Job {
    name: string;
    start: PositionEntity;
    end: PositionEntity;
    jobFunc: JobFunc;
    candidateFilter: CreepFilter;
    candidateCmp: CreepCmp;
    creep: Screep; // Set during executiong
    bodyReq: BodyPart[]

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
        this.bodyReq = opts['bodyReq']
        this.candidateCmp = opts['candidateCmp']
        if (this.bodyReq == undefined) {
            console.log("Bad job!!, no body " + this.name)
            console.log(opts['bodyReq'])
            throw new Error("Bad job="+this.name)
        }
    }

    toJSON() {
        var jobFn: any = this.jobFunc;
        var filterFn: any = this.candidateFilter;
        var cmpFn: any = this.candidateCmp;
        var ret = {
            name: this.name,
            start: this.start.id,
            jobFunc: RolesReverse[jobFn],
            candidateCmp: CmpReverse[cmpFn],
            bodyReq: this.bodyReq
        };
        if (this.end != undefined) {
            ret['end'] = this.end.id;
        }
        return ret
    }
}

var parseJob = (k: string, v): any => {
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

var clearJob = (creep: Screep, job: Job) => {
    delete Memory['job_workers'][job.name];
    delete job.creep
    delete creep.job
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

var createPickupJob = (target: PositionEntity): Job => {
    return new Job({
        namePrefix: 'carry',
        start: target,
        end: findNearestStorage(target),
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    })
}

var createFillJob = (target: PositionEntity): Job => {
    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    })
}

var createDeliverJob = (target: PositionEntity): Job => {
    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        jobFunc: Roles['deliver'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['noop'],
    })
}

var createUpgradeJob = (target: PositionEntity): Job => {
    return new Job({
        namePrefix: 'upgrade',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    })
}


// TODO: API to add jobs, some way to combine in-memory jobs with in-code jobs
// fitness func for candidates based on distance.
var runAllJobs = (staticJobs: Job[], memJobs: Job[]) => {

    var addJob = (job: Job) => {
        memJobs.push(job)
    }

    var removeJob = (job: Job) => {
        var idx = memJobs.indexOf(job)
        if (idx < 0) return
        memJobs.splice(idx, 1)

        idx = jobs.indexOf(job)
        jobs.splice(idx, 1)

    }

    var jobs = staticJobs.concat(memJobs)

    if (Memory['job_workers'] == undefined) {
        console.log("replacing worker map1!!")
        Memory['job_workers'] = {}
    }
    var creeps: Screep[] = []
    for (var n of Object.keys(Game.creeps)) {
        if (Game.creeps[n].spawning) continue;
        creeps.push(Game.creeps[n])
    }

    var seenJobs: { [index: string]: boolean } = {}


    for (var job of jobs) {
        // check if still valid

        // Check for Dupe
        if (seenJobs[job.name]) {
            console.log("DUPLICATE JOB IN LIST!! " + job.name)
        }
        seenJobs[job.name] = true

        var creepName: string = Memory['job_workers'][job.name];
        var creep: Screep = undefined;
        console.log(job.name, creepName, job.start)
        if (creepName != undefined) {
            creep = Game.creeps[creepName]
            if (job.start == undefined || job.start == null) {
                console.log("Start disappeared for " + job.name)
                removeJob(job)
                if (creep != undefined) {
                    clearJob(creep, job)
                }
                continue
            }
        } else {
            if (job.start == undefined || job.start == null) {
                console.log("Start disappeared for " + job.name)
                removeJob(job)
                continue
            }
        }
        if (creep == undefined) {
            delete Memory['job_workers'][job.name];
        } else {
            console.log("setting " + creep.name + " to do " + job.name)
            setJob(creep, job);
        }
    }

    // Job creators

    // Gather dropped resources
    var GATHER_THRESHOLD = 200 // TODO: Set based on available creeps
    for (var roomName of Object.keys(Game.rooms)) {
        var room = Game.rooms[roomName]
        var resources = room.find(FIND_DROPPED_RESOURCES)
        var resourcesById: { [index: string]: number } = {}
        for (var job of jobs) {
            if (job.start == null) continue;
            //console.log(job.name, job.start)
            if ((<Resource>job.start).resourceType == RESOURCE_ENERGY) {
                if (resourcesById[job.start.id] == undefined) {
                    resourcesById[job.start.id] = 0;
                }
                console.log(job.name, job.creep)
                if (job.creep != undefined) {
                    resourcesById[job.start.id] += (job.creep.carryCapacity - job.creep.carry.energy);
                } else {
                    // Only want one empty job per resource, default to infinity if there are no creeps
                    resourcesById[job.start.id] += 999
                }
            }
        }
        console.log(JSON.stringify(resourcesById))

        for (var resource of resources) {
            var currentlyAllocatedCapacity = resourcesById[resource.id] || 0;
            if ((resource.amount - currentlyAllocatedCapacity) > GATHER_THRESHOLD) {
                console.log("New pickup job")
                addJob(createPickupJob(resource))
            }
        }
    }

    const STRUCTURES_TO_INVESTIGATE = [STRUCTURE_TOWER, STRUCTURE_CONTROLLER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION]
    var structures = {}
    for (var roomName of Object.keys(Game.rooms)) {
        var room = Game.rooms[roomName];
        var roomStructures = room.find(FIND_STRUCTURES)
        for (var structType of STRUCTURES_TO_INVESTIGATE) {
            structures[structType] = (structures[structType] || []).concat(roomStructures.filter(s=> { return s.structureType == structType }))
        }
    }
    for (var structType of STRUCTURES_TO_INVESTIGATE) {
        for (var struct of structures[structType]) {
            if (struct.owner && struct.owner.username != 'omgbear') continue;
            var jobsForStruct = []
            for (var job of jobs) {
                if (job.start && job.start.id == struct.id || (job.end && job.end.id == struct.id)) {
                    jobsForStruct.push(job)
                }
            }
            // Determine if we need new jobs now
            switch (structType) {
                case STRUCTURE_TOWER:
                case STRUCTURE_SPAWN:
                case STRUCTURE_EXTENSION:
                    if (struct.energy < struct.energyCapacity) {
                        if (jobsForStruct.length == 0) {
                            addJob(createFillJob(struct))
                        }
                    }
                    break;
                case STRUCTURE_CONTROLLER:
                    if (struct.level < 5) {
                        if (jobsForStruct.length < 3) {
                            addJob(createUpgradeJob(struct))
                        }
                    } else {
                        if (jobsForStruct.length < 2) {
                            addJob(createUpgradeJob(struct))
                        }
                    }
                    break;
            }
        }
    }
    // if (room.controller && room.controller.owner && room.controller.owner.username == 'omgbear')
    //     for (var struct of roomStructures) {
    //         // todo only repair walls in myrooms
    //         if (struct.hits < Math.min(struct.hitsMax, 50000) {
    //             // check it doesnt exist, take into acount above as well
    //             addJob(createRepairJob(struct))
    //         }
    //     }
    // }
    // var roomSites = room.find(FIND_MY_CONSTRUCTION_SITES)
    // for (var site of roomSites) {
    //     // todo only repair walls in myrooms
    //     // track buildrers on all sites -- maybe a construction foreman so we dont spawn tons of jobs and
    //     if (struct.hits < Math.min(struct.hitsMax, 50000) {
    //         addJob(createRepairJob(struct))
    //     }
    // }


 

    // Mine all sources
    // Find all sources in rooms, make sure there is a job to mine each

    // Build things
    // Repair things
    // etc.

    // Defend, attack, etc.

    // Allocate jobs


    var noJob = (c: Screep): boolean => {
        return c.job == undefined || c.job == null
    }

    var getCandidateFilter = (bodyReq: BodyPart[]): CreepFilter => {
        var br = bodyReq.slice(0)
        return (creep: Creep): boolean => {
            for (var neededPart of br) {
                var found = false
                for (var bodyPart of creep.body) {
                    if (bodyPart.type == neededPart) {
                        found = true
                        break
                    }
                }
                if (!found) return false;
            }
            console.log("ok to assign "  + JSON.stringify(creep.body) + " to "+ bodyReq)
            return true;
        }
    }

    var findSuitableCreep = (job: Job): Screep => {
        var candidates: Screep[] = creeps.filter(noJob).filter(getCandidateFilter(job.bodyReq)).sort(job.candidateCmp)
        if (candidates.length > 0) {
            return candidates[0];
        } else {
            return null;
        }
    }
    var neededCreeps: BodyPart[][] = []
    for (var job of jobs) {
        if (job.creep != undefined) {
            continue;
        }
        //pick new one
        console.log("Need to replace creep for job " + job.name)
        // TODO figure out currying to pass job into cmp function
        var creep = findSuitableCreep(job)
        if (creep != null) {
            console.log("Picked creep for job " + job.name + " got " + creep.name);
            setJob(creep, job);
        } else {
            console.log("no candidates for job=" + job.name + "  " + job.bodyReq)
            neededCreeps.push(job.bodyReq)
        }
    }

    var runJob = (creep: Screep, job: Job): number => {
        var ret
        try {
            ret = creep.job.jobFunc(creep, creep.job)
        } catch (ex) {
            console.log("Crash running job " + creep.job.name + " and msg " + ex)
            console.log(ex.stack)
            ret = E_CRASH
        }
        switch (ret) {
            case JOB_COMPLETE:
                creep.log("Job complete!")
                removeJob(creep.job)
                clearJob(creep, creep.job)
                break;
            case E_CRASH:
            case ERR_NOT_FOUND:
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case ERR_INVALID_ARGS:
            case ERR_NOT_OWNER:
                creep.log("Job Failed!! err=" + ret)
                removeJob(creep.job)
                clearJob(creep, creep.job)
        }
        return ret
    }

    job = null
    for (var creep of creeps) {
        if (creep.spawning) continue;
        if (creep.job != undefined) {
            creep.log("job=" + creep.job.name)
            if (creep.job.start == undefined) {
                // TODO: Cleanup
                removeJob(creep.job)
                clearJob(creep, creep.job)
                continue;
            }
            runJob(creep, job)
        // } else if (creep.carry.energy > 0) {
        //     var j = createDeliverJob(creep)
        //     addJob(j)
        //     setJob(creep, j)
        //     runJob(creep, j)
        } else {
            creep.log("Nothing to do")
        }
    }

    // Building based jobs?!
    // need to spawn a creep
    spawnCreeps(neededCreeps)
}

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
    console.log("Body costs " + cost)
    var bodyCounts = Math.min(Math.floor(energyCapacity / cost), Math.floor(50 / body.length))
    console.log("Going to build x" + bodyCounts)
    for (var i = 0; i < bodyCounts; i++) {
        Array.prototype.push.apply(bodyParts, body)
    }
    return bodyParts
}


// TODO: Some sort of limits on creeps, maybe reduce chance of spawning duplicate bodies?
var spawnCreeps = (bodyParts: BodyPart[][]) => {
    if (bodyParts.length == 0) return;
    // for each spawn, pick a random body, then build the largest of that type for the given spawn
    for (var spawnName of Object.keys(Game.spawns)) {
        var spawn = Game.spawns[spawnName];
        if (spawn.spawning != null) continue;
        var idx = Math.floor(Math.random() * bodyParts.length)
        var body = bodyParts[idx]
        var bod = getBodyDefinition(body, spawn.room.energyAvailable)
        console.log("Want to spawn ", bod)
        var err = spawn.createCreep(bod)
        if (err == 0) {
            bodyParts.splice(idx)
        } else {
            console.log(err)
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
    if (s.carry != undefined) {
        return s.carry.energy > 0
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
            var err
            var start: Structure = <Structure>job.start
            if ((start).structureType == 'controller' && start.owner && start.owner.username == 'omgbear') {
                err = creep.upgradeController(<Structure>job.start)
            } else {
                err = creep.transferEnergy(<Structure>job.start);
            }
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.start);
            }
        }
        if (creep.carry.energy == 0) {
            return JOB_COMPLETE;
        }
        return err
    },

    carry: (creep: Screep, job: Job): number => {

        if (job.start != undefined && creep.carry.energy < creep.carryCapacity && hasEnergy(job.start)) {
            if (!creep.pos.isNearTo(job.start)) {
                creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 })
            } else {
                var err;
                if ((<Energy>job.start).amount != undefined) {
                    err = creep.pickup(<Energy>job.start);
                } else {
                    err = (<EnergyHolder>job.start).transferEnergy(creep)
                }

                if (err == ERR_NOT_IN_RANGE) {
                    err = creep.moveTo(job.start);
                }
            }
        }

        if (creep.carry.energy > 0) {
            job.jobFunc = Roles['deliver']
            job.start = job.end
            if (job.end == undefined) {
                job.end = findNearestStorage(creep)
            }
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
    bodyReq: [WORK, MOVE],
    candidateCmp: Cmp['worksHard'],
}), new Job({
    name: "mega_miner_2",
    start: Game.flags['Mine_1_2'],
    jobFunc: Roles['megaMiner'],
    bodyReq: [WORK, MOVE],
    candidateCmp: Cmp['worksHard'],
})]



var memJobs: Job[] = [];
try {
    var jobsJSON = Memory["jobs"];
    if (jobsJSON != undefined) {
        memJobs = JSON.parse(jobsJSON, parseJob)
    }
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