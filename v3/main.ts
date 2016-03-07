// Change spawn system to be based on user-chosen ratios

// add job age

/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />
/// <reference path="jobs.ts" />


/// <reference path="utils.ts" />
/// <reference path="roles.ts" />
/// <reference path="assign_jobs.ts" />
/// <reference path="create_jobs.ts" />
/// <reference path="spawn.ts" />
/// <reference path="tower.ts" />


type JobFunc = (creep: Screep, job: Job) => number;
type CreepFilter = (creep: Screep) => boolean;
type JobFilter = (job:Job) => boolean;
type CreepCmp = (a: Creep, b: Screep) => number;

var cpuOverBudget = () =>
((Game.cpu.bucket < 5000 && Game.cpu.getUsed() > 100) ||
    (Game.cpu.bucket < 2000 && Game.cpu.getUsed() > 30)  ||
    (Game.cpu.bucket < 1000 && Game.cpu.getUsed() > 10)  ||
    Game.cpu.bucket < 100)


interface EnergyHolder extends Structure {
    energy: number;
    energyCapacity: number;
    transferEnergy(c: Creep)
}

// TODO: figure out better idle situation
// TODO: road creator -- keep map of road positions, pave most traveled unpaved area
// TODO : maximize upgrading!


var runStructures = (jobs:Job[]) => {
    for(var roomName of Object.keys(Game.rooms)) {
        var room = Game.rooms[roomName]
        for (var struct of room.find(FIND_MY_STRUCTURES)){
            switch(struct.structureType) {
                case STRUCTURE_TOWER:
                runTower(struct)
                break
                case STRUCTURE_SPAWN:
                runSpawn(struct, jobs)
                break
            }
        }    
    }
}

// Defend, attack, etc.
// Assign jobs to creeps

var memJobs: Job[] = loadJobs();
var addJob = (job: Job) => {
    if(memJobs.length > MAX_JOBS && job.priority != Priority.HIGH) {
        return // skipp 
    }
    memJobs.push(job)
}

var removeJob = (job: Job) => {
    var idx = memJobs.indexOf(job)
    if (idx < 0) return
        memJobs.splice(idx, 1)
}

if (!e(memJobs)) {
    memJobs = []
}
var preJobTs = Game.cpu.getUsed()
console.log(preJobTs)
runStructures(memJobs)
doJobs(memJobs)
createJobs(memJobs)
//spawnNewCreeps(memJobs)
saveJobs(memJobs)
var postJobTs = Game.cpu.getUsed()
console.log(postJobTs - preJobTs)

Game.Roles = Roles

var clk = Game.flags['Clock']
if (e(clk)) clk.setColor(clk.color == COLOR_WHITE ? COLOR_GREY : COLOR_WHITE)


Game.listJobs = () => {
    for (var job of memJobs) {
        console.log(job.name, job.creep.name, job.target)
    }
}