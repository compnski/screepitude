var VER = 1;
var SuperCreep = (function () {
    function SuperCreep() {
    }
    SuperCreep.prototype.howManyParts = function (part) {
        return this.body.filter(function (s) { return (s.type == part && s.hits > 0); }).length;
    };
    SuperCreep.prototype.hasPart = function (part) {
        return this.howManyParts(part) > 0;
    };
    SuperCreep.prototype.canMove = function () {
        return this.hasPart(MOVE);
    };
    SuperCreep.prototype.canWork = function () {
        return this.hasPart(WORK);
    };
    SuperCreep.prototype.canHeal = function () {
        return this.hasPart(HEAL);
    };
    SuperCreep.prototype.canAttack = function () {
        return this.hasPart(ATTACK);
    };
    SuperCreep.prototype.canShoot = function () {
        return this.hasPart(RANGED_ATTACK);
    };
    SuperCreep.prototype.canClaim = function () {
        return this.hasPart(CLAIM);
    };
    SuperCreep.prototype.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i - 0] = arguments[_i];
        }
        console.log.apply(console, ["[" + this.name + "]"].concat(msg));
    };
    return SuperCreep;
})();
function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}
applyMixins(Creep, [SuperCreep]);
var JOB_COMPLETE = 999;
var E_CRASH = -99;
var ERR_LOW_CPU = -50;
var Priority;
(function (Priority) {
    Priority[Priority["LOW"] = 0] = "LOW";
    Priority[Priority["NORMAL"] = 1] = "NORMAL";
    Priority[Priority["HIGH"] = 3] = "HIGH";
})(Priority || (Priority = {}));
var Job = (function () {
    function Job(opts) {
        if (opts === void 0) { opts = {}; }
        this.name = opts['name'];
        var np = opts['namePrefix'];
        if (np != undefined) {
            if (Memory["jobCounts"] == undefined)
                Memory["jobCounts"] = {};
            if (Memory["jobCounts"][np] == undefined)
                Memory["jobCounts"][np] = 0;
            Memory["jobCounts"][np] += 1;
            this.name = np + "_" + Memory["jobCounts"][np];
        }
        this.target = opts['target'];
        this.jobFunc = opts['jobFunc'];
        this.bodyReq = opts['bodyReq'];
        this.priority = opts['priority'] || Priority.NORMAL;
        if (this.bodyReq == undefined) {
            console.log("Bad job!!, no body " + this.name);
            console.log(opts['bodyReq']);
            throw new Error("Bad job=" + this.name);
        }
    }
    Job.prototype.toJSON = function () {
        try {
            var jobFn = this.jobFunc;
            var ret = {
                name: this.name,
                target: this.target.id,
                jobFunc: RolesReverse[jobFn],
                bodyReq: this.bodyReq,
                priority: this.priority
            };
            return ret;
        }
        catch (ex) {
            console.log("Error converting struct to json for:  " + this.name);
            console.log(ex.stack);
        }
    };
    return Job;
})();
var parseJob = function (k, v) {
    switch (k) {
        case 'target':
            var r = Game.getObjectById(v);
            if (r == undefined) {
                console.log("FAILED TO LOAD " + k + " from " + v);
            }
            return r;
            break;
        case 'jobFunc':
            return Roles[v];
            break;
        case '':
            return v.map(function (o) { return new Job(o); });
    }
    return v;
};
var setJob = function (creep, job) {
    Memory['job_workers'][job.name] = creep.name;
    job.creep = creep;
    creep.job = job;
};
var clearJob = function (creep, job) {
    if (job != null && job != undefined) {
        delete Memory['job_workers'][job.name];
        delete job.creep;
    }
    if (e(creep))
        delete creep.job;
    removeJob(job);
};
var loadCreepJobs = function (jobs) {
    var seenJobs = {};
    for (var _i = 0; _i < jobs.length; _i++) {
        var job = jobs[_i];
        if (seenJobs[job.name]) {
            console.log("DUPLICATE JOB IN LIST!! " + job.name);
        }
        seenJobs[job.name] = true;
        var creepName = Memory['job_workers'][job.name];
        var creep = undefined;
        if (creepName != undefined) {
            creep = Game.creeps[creepName];
            if (job.target == undefined || job.target == null) {
                console.log("Start disappeared for " + job.name);
                clearJob(creep, job);
                continue;
            }
        }
        else {
            if (job.target == undefined || job.target == null) {
                console.log("Start disappeared for " + job.name);
                clearJob(null, job);
                continue;
            }
        }
        if (creep == undefined || creep == null) {
            delete Memory['job_workers'][job.name];
        }
        else {
            setJob(creep, job);
        }
    }
    cleanJobs(jobs, seenJobs);
    return seenJobs;
};
var cleanJobs = function (jobs, seenJobs) {
    for (var _i = 0, _a = Object.keys(Memory['job_workers']); _i < _a.length; _i++) {
        var jobName = _a[_i];
        var creepName = Memory['job_workers'][jobName];
        if (seenJobs[jobName] !== true || !e(Game.creeps[creepName])) {
            clearJob(Game.creeps[creepName], job);
        }
    }
    for (var _b = 0; _b < jobs.length; _b++) {
        var job = jobs[_b];
        if (!e(job.target)) {
            clearJob(job.creep, job);
        }
    }
};
var runAllJobs = function (creeps) {
    for (var _i = 0; _i < creeps.length; _i++) {
        var creep = creeps[_i];
        if (e(creep.job)) {
            var jobName = creep.job.name;
            var err = runJob(creep, creep.job);
        }
        else {
            if (Game.flags['Idle'] != undefined) {
                creep.moveTo(Game.flags['Idle']);
            }
        }
    }
};
var displayName = function (s) {
    return new String(s);
};
var runJob = function (creep, job) {
    if (job.priority != Priority.HIGH && cpuOverBudget()) {
        return ERR_LOW_CPU;
    }
    var ret;
    try {
        ret = creep.job.jobFunc(creep, creep.job);
    }
    catch (ex) {
        console.log("Crash running job " + creep.job.name + " and msg " + ex);
        console.log(ex.stack);
        ret = E_CRASH;
    }
    switch (ret) {
        case JOB_COMPLETE:
            {
                creep.log("Complete! job=" + job.name + " target=" + displayName(job.target));
                clearJob(creep, creep.job);
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
            creep.log("Failed!! job=" + job.name + " err=" + ret + " target=" + displayName(job.target));
            clearJob(creep, creep.job);
            break;
        case 0:
        case ERR_TIRED:
            break;
        default:
    }
    return ret;
};
var MAX_JOBS = 200;
var doJobs = function (jobs) {
    if (Memory['job_workers'] == undefined) {
        console.log("replacing worker map1!!");
        Memory['job_workers'] = {};
    }
    var creeps = [];
    for (var _i = 0, _a = Object.keys(Game.creeps); _i < _a.length; _i++) {
        var n = _a[_i];
        if (Game.creeps[n].spawning)
            continue;
        creeps.push(Game.creeps[n]);
    }
    loadCreepJobs(jobs);
    assignAllJobs(creeps, jobs);
    runAllJobs(creeps);
};
var loadJobs = function () {
    var jobs;
    try {
        var jobsJSON = Memory["jobs"];
        if (jobsJSON != undefined) {
            jobs = JSON.parse(jobsJSON, parseJob);
        }
    }
    catch (ex) {
        console.log("Error parsing in memory jobs!: " + ex + "\n  " + Memory["jobs"]);
        console.log(ex.stack);
    }
    return jobs;
};
var saveJobs = function (jobs) {
    Memory["jobs"] = JSON.stringify(jobs);
};
var e = function (o) {
    return o != null && o != undefined;
};
var roomControlledByMe = function (room) {
    if (room == undefined || room.controller == undefined) {
        return false;
    }
    if (room.controller.owner != undefined && room.controller.owner.username == 'omgbear') {
        return true;
    }
    if (room.controller.reservation != undefined && room.controller.reservation.username == 'omgbear') {
        return true;
    }
    return false;
};
var ownedByMe = function (struct) {
    if (struct.owner && struct.owner.username == 'omgbear') {
        return true;
    }
    return roomControlledByMe(struct.room);
};
var getMyStructuresInAllRooms = function (structTypes) {
    var structs = [];
    for (var _i = 0, _a = Object.keys(Game.rooms); _i < _a.length; _i++) {
        var roomName = _a[_i];
        structs.push.apply(getMyStructuresInRoom(roomName, structTypes));
    }
    return structs;
};
var needsEnergy = function (s) {
    if (s.constructor == ConstructionSite) {
        return true;
    }
    switch (s.structureType) {
        case STRUCTURE_STORAGE:
            return s.store.energy < s.storeCapacity;
        case STRUCTURE_TOWER:
            return s.energy < s.energyCapacity * .95;
        case STRUCTURE_SPAWN:
        case STRUCTURE_EXTENSION:
        case STRUCTURE_LINK:
        case STRUCTURE_POWER_SPAWN:
            return s.energy < s.energyCapacity;
        case STRUCTURE_CONTROLLER:
            return true;
    }
    console.log("unknown struct needs energy" + s);
    return false;
};
var getMyStructuresInRoom = function (roomName, structTypes) {
    var room = Game.rooms[roomName];
    if (room == undefined) {
        console.log("Can't find room " + roomName);
        return [];
    }
    if (room["my_structures"] == undefined) {
        room["my_structures"] = room.find(FIND_MY_STRUCTURES);
    }
    return room["my_structures"].filter(function (s) { return structTypes.indexOf(s.structureType) > -1; });
};
var needsRepair = function (s) {
    if (s.structureType == STRUCTURE_WALL) {
        return s.hits < Math.min(s.hitsMax, 10000);
    }
    if (s.structureType == STRUCTURE_RAMPART) {
        return s.hits < Math.min(s.hitsMax, 10000);
    }
    return s.hits < s.hitsMax;
};
var hasEnergy = function (s) {
    if (s.amount != undefined) {
        return s.amount > 50;
    }
    if (s.store != undefined) {
        return s.store.energy > 500;
    }
    if (s.carry != undefined) {
        return s.carry.energy > 0;
    }
    if (s.energy != undefined) {
        return s.energy > 0;
    }
    return false;
};
var targetInSameOrNewRoom = function (roomName) {
    return function (job) {
        return (e(job.target) && (!e(job.target.room) || !e(job.target.room.storage) || job.jobFunc == Roles['megaMiner'] || job.target.pos.roomName == roomName));
    };
};
var canDoJobFilter = function (creep) {
    return function (job) {
        for (var _i = 0, _a = job.bodyReq; _i < _a.length; _i++) {
            var neededPart = _a[_i];
            var found = false;
            for (var _b = 0, _c = creep.body; _b < _c.length; _b++) {
                var bodyPart = _c[_b];
                if (bodyPart.type == neededPart) {
                    found = true;
                    break;
                }
            }
            if (!found)
                return false;
        }
        return true;
    };
};
var noCreepAssigned = function (job) {
    return job.creep == undefined;
};
var sortJobsByRange = function (pos, possibleJobs) {
    var distanceCache = {};
    possibleJobs.sort(function (a, b) {
        if (distanceCache[a.target.id] == undefined) {
            distanceCache[a.target.id] = pos.getRangeTo(a.target) - (a.priority * 20);
        }
        if (distanceCache[b.target.id] == undefined) {
            distanceCache[b.target.id] = pos.getRangeTo(b.target) - (b.priority * 20);
        }
        return distanceCache[a.target.id] - distanceCache[b.target.id];
    });
};
var findBestJob = function (creep, jobs) {
    var possibleJobs = (jobs
        .filter(noCreepAssigned)
        .filter(targetInSameOrNewRoom(creep.pos.roomName))
        .filter(canDoJobFilter(creep)));
    sortJobsByRange(creep.pos, possibleJobs);
    if (possibleJobs.length > 0) {
        return possibleJobs[0];
    }
    return null;
};
var assignAllJobs = function (creeps, jobs) {
    creeps.sort(function (a, b) { return b.body.length - a.body.length; });
    for (var _i = 0; _i < creeps.length; _i++) {
        var creep = creeps[_i];
        if (creep.spawning)
            continue;
        if (!e(creep.job) || !e(creep.job.target)) {
            if (!e(creep.job)) {
                clearJob(creep, creep.job);
            }
            var job = findBestJob(creep, jobs);
            if (e(job)) {
                creep.memory = {};
                setJob(creep, job);
            }
        }
    }
};
var newFillJob = function (target, priority) {
    if (priority === void 0) { priority = Priority.NORMAL; }
    return new Job({
        namePrefix: 'fill',
        target: target,
        jobFunc: Roles['fillStruct'],
        bodyReq: [MOVE, CARRY, CARRY],
        priority: priority,
    });
};
var newBuildJob = function (target) {
    return new Job({
        namePrefix: 'build',
        target: target,
        jobFunc: Roles['fillStruct'],
        bodyReq: [MOVE, MOVE, WORK, CARRY],
    });
};
var newUpgradeJob = function (target) {
    return new Job({
        namePrefix: 'upgrade',
        target: target,
        jobFunc: Roles['fillStruct'],
        bodyReq: [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
    });
};
var newRepairJob = function (target) {
    return new Job({
        namePrefix: 'repair',
        target: target,
        jobFunc: Roles['repair'],
        bodyReq: [MOVE, WORK, CARRY],
    });
};
var newMinerJob = function (target) {
    return new Job({
        namePrefix: "miner",
        target: target,
        jobFunc: Roles['megaMiner'],
        bodyReq: [WORK, WORK, MOVE],
        priority: Priority.HIGH,
    });
};
var createJobs = function (jobs) {
    var STRUCTURES_TO_INVESTIGATE = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_CONTROLLER];
    var structures = {};
    for (var _i = 0, _a = Object.keys(Game.rooms); _i < _a.length; _i++) {
        var roomName = _a[_i];
        var room = Game.rooms[roomName];
        createJobsForRoom(jobs, room);
    }
};
var jobsForTarget = function (jobs, targetId) {
    return jobs.filter(function (j) {
        return j.target != null && j.target.id == targetId;
    });
};
var maybeCreateFillJob = function (jobs, struct) {
    var filledPercent = struct.energy / struct.energyCapacity;
    switch (struct.structureType) {
        case STRUCTURE_TOWER:
            if (filledPercent < .8) {
                addJob(newFillJob(struct));
            }
            else if (filledPercent < .9) {
                addJob(newFillJob(struct, Priority.LOW));
            }
            break;
        default:
            if (filledPercent < 1) {
                addJob(newFillJob(struct));
            }
    }
};
var createJobsForRoom = function (jobs, room) {
    room.structures = room.find(FIND_STRUCTURES);
    createResourceGatheringJobs(jobs, room);
    createFillJobsForRoom(jobs, room);
    createRepairJobsForRoom(jobs, room);
    createConstrutionJobsForRoom(jobs, room);
};
var createFillJobsForRoom = function (jobs, room) {
    for (var _i = 0, _a = room.structures; _i < _a.length; _i++) {
        var struct = _a[_i];
        if (!ownedByMe(struct)) {
            continue;
        }
        var jobsForStruct = jobsForTarget(jobs, struct.id);
        switch (struct.structureType) {
            case STRUCTURE_TOWER:
            case STRUCTURE_SPAWN:
            case STRUCTURE_EXTENSION: {
                if (jobsForStruct.length < 1)
                    maybeCreateFillJob(jobs, struct);
                break;
            }
            case STRUCTURE_STORAGE: {
                if (jobsForStruct.length < 5)
                    addJob(newFillJob(struct, Priority.LOW));
                break;
            }
            case STRUCTURE_CONTROLLER: {
                var ctrl = struct;
                if (room.storage != undefined) {
                    if (room.storage.store.energy > 10000) {
                        if (jobsForStruct.length < 3)
                            addJob(newUpgradeJob(ctrl));
                    }
                }
                else if (ctrl.level < 5) {
                    if (jobsForStruct.length < 4)
                        addJob(newUpgradeJob(ctrl));
                }
                break;
            }
        }
    }
};
var createRepairJobsForRoom = function (jobs, room) {
    for (var _i = 0, _a = room.structures; _i < _a.length; _i++) {
        var struct = _a[_i];
        if (ownedByMe(struct) && needsRepair(struct)) {
            var jobExists = false;
            for (var _b = 0; _b < jobs.length; _b++) {
                var j = jobs[_b];
                if (j.jobFunc == Roles['repair'] && j.target.id == struct.id) {
                    jobExists = true;
                    break;
                }
                if (jobExists) {
                    break;
                }
            }
            if (!jobExists) {
                console.log("Repair site: " + struct.id);
                addJob(newRepairJob(struct));
            }
        }
    }
};
var createConstrutionJobsForRoom = function (jobs, room) {
    var roomSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    for (var _i = 0; _i < roomSites.length; _i++) {
        var site = roomSites[_i];
        var jobsForSite = jobsForTarget(jobs, site.id);
        var BUILDERS_PER_SITE = 2;
        if (jobsForSite.length < BUILDERS_PER_SITE) {
            addJob(newBuildJob(site));
        }
    }
};
var createResourceGatheringJobs = function (jobs, room) {
    if (roomControlledByMe(room)) {
        for (var _i = 0, _a = room.find(FIND_SOURCES); _i < _a.length; _i++) {
            var source = _a[_i];
            if (hasEnergy(source) && jobsForTarget(jobs, source.id).length < 1) {
                addJob(newMinerJob(source));
            }
        }
    }
};
var transferEnergy = function (from, to) {
    if (to.constructor == ConstructionSite) {
        return from.build(to);
    }
    if (to.structureType == 'controller' && to.owner && to.owner.username == 'omgbear') {
        return from.upgradeController(to);
    }
    if (from.transferEnergy != undefined) {
        return from.transferEnergy(to);
    }
    if (from.transfer != undefined) {
        return from.transfer(to, RESOURCE_ENERGY);
    }
};
var findNearestEnergyProviders = function (target) {
    var sources = new Array().concat(target.room.find(FIND_DROPPED_RESOURCES), target.room.find(FIND_MY_STRUCTURES).filter(function (s) {
        if (s.id == target.id) {
            return false;
        }
        switch (s.structureType) {
            case STRUCTURE_STORAGE: {
                return s.store.energy > 1000;
            }
            case STRUCTURE_TOWER:
                return s.room.storage == undefined && s.energy > s.energyCapacity * 0.9;
            case STRUCTURE_SPAWN:
                return s.room.storage == undefined && false;
            case STRUCTURE_LINK:
                return s.energy > 0;
        }
    }));
    return sources;
};
var findBestSource = function (creep, target) {
    var allSources = findNearestEnergyProviders(target);
    var distanceCache = {};
    allSources = allSources.filter(function (s) { return s != null; });
    allSources.sort(function (a, b) {
        if (distanceCache[a.id] == undefined)
            distanceCache[a.id] = creep.pos.getRangeTo(a) + target.pos.getRangeTo(a);
        if (distanceCache[b.id] == undefined)
            distanceCache[b.id] = creep.pos.getRangeTo(b) + target.pos.getRangeTo(b);
        return distanceCache[a.id] - distanceCache[b.id];
    });
    if (allSources.length > 0)
        return allSources[0];
    return null;
};
var Roles = {
    megaMiner: function (creep, job) {
        var sourceId = creep.memory.sId;
        var source;
        if (sourceId != undefined) {
            source = Game.getObjectById(sourceId);
        }
        if (source == undefined) {
            if (!creep.pos.isNearTo(job.target)) {
                creep.moveTo(job.target, { reusePath: 20, maxOps: 1000 });
            }
            source = job.target.pos.findClosestByRange(FIND_SOURCES);
            if (source != undefined) {
                creep.memory.sId = source.id;
            }
        }
        if (source != undefined) {
            var err = creep.harvest(source);
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(source);
            }
            if (creep.carry.energy > 0) {
                creep.drop(RESOURCE_ENERGY);
            }
        }
        return err;
    },
    repair: function (creep, job) {
        if (!needsRepair(job.target)) {
            return JOB_COMPLETE;
        }
        if (creep.carry.energy < 50) {
            var energySource = findBestSource(creep, job.target);
            var err = ERR_NOT_IN_RANGE;
            if (creep.pos.isNearTo(energySource)) {
                err = transferEnergy(energySource, creep);
            }
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(energySource, { reusePath: 40, maxOps: 1000 });
            }
        }
        if (!creep.pos.isNearTo(job.target)) {
            creep.moveTo(job.target, { reusePath: 40, maxOps: 1000 });
        }
        else {
            err = creep.repair(job.target);
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.target);
            }
        }
        if (creep.carry.energy == 0 || !needsRepair(job.target)) {
            return JOB_COMPLETE;
        }
        return err;
    },
    fillFromBestSource: function (creep, job) {
        var source;
        var err;
        if (creep.memory['src'] != undefined) {
            source = Game.getObjectById(creep.memory['src']);
        }
        if (!e(source) || !hasEnergy(source)) {
            source = findBestSource(creep, job.target);
        }
        if (source == null) {
            return ERR_NOT_ENOUGH_RESOURCES;
        }
        creep.memory['src'] = source.id;
        if (!creep.pos.isNearTo(source)) {
            err = creep.moveTo(source, { reusePath: 20, maxOps: 1000 });
        }
        else {
            if (source.amount != undefined) {
                err = creep.pickup(source);
            }
            else {
                err = source.transferEnergy(creep);
            }
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(source);
            }
        }
        if (creep.carry.energy == creep.carryCapacity || !hasEnergy(source)) {
            delete creep.memory['src'];
            return JOB_COMPLETE;
        }
        if (err == ERR_NO_PATH) {
            err = wiggle(creep);
        }
        return err;
    },
    fillStruct: function (creep, job) {
        var err;
        if (!needsEnergy(job.target)) {
            creep.log("no energy needed for " + job.target);
            return JOB_COMPLETE;
        }
        if (creep.carry.energy < 50) {
            err = Roles["fillFromBestSource"](creep, job);
            if (err != JOB_COMPLETE) {
                return err;
            }
        }
        err = transferEnergy(creep, job.target);
        if (err == ERR_NOT_IN_RANGE) {
            err = creep.moveTo(job.target, { reusePath: 20, maxOps: 1000 });
        }
        if (!needsEnergy(job.target)) {
            creep.log("no energy needed for " + job.target);
            return JOB_COMPLETE;
        }
        if (err == ERR_NO_PATH) {
            err = wiggle(creep);
        }
        return err;
    }
};
var RolesReverse = {};
for (var _i = 0, _a = Object.keys(Roles); _i < _a.length; _i++) {
    var rn = _a[_i];
    var fn = Roles[rn];
    RolesReverse[fn] = rn;
}
var wiggle = function (creep) {
    return creep.move(Math.floor(1 + Math.random() * 7));
};
var MAX_CREEPS_PER_ROOM = 20;
var runSpawn = function (spawn, jobs) {
    var neededCreeps = getNeededCreeps(jobs.filter(targetInSameOrNewRoom(spawn.pos.roomName)));
    var creepsInRoom = spawn.room.find(FIND_MY_CREEPS).length;
    if (neededCreeps.length == 0 || creepsInRoom > MAX_CREEPS_PER_ROOM || creepsInRoom > 4 && spawn.room.energyAvailable < spawn.room.energyCapacityAvailable) {
        return;
    }
    spawnCreeps(spawn, neededCreeps);
};
var getNeededCreeps = function (jobs) {
    var neededCreeps = [];
    for (var _i = 0; _i < jobs.length; _i++) {
        var job = jobs[_i];
        if (job.creep == undefined) {
            for (var i = 0; i < job.priority; i++) {
                neededCreeps.push(job.bodyReq);
            }
        }
    }
    return neededCreeps;
};
var getBodyCost = function (body) {
    var cost = 0;
    for (var _i = 0; _i < body.length; _i++) {
        var part = body[_i];
        cost += BODYPART_COST[part];
    }
    return cost;
};
var getBodyDefinition = function (body, energyCapacity) {
    var bodyParts = [];
    var cost = getBodyCost(body);
    var bodyCounts = Math.min(Math.floor(energyCapacity / cost), Math.floor(50 / body.length));
    for (var i = 0; i < bodyCounts; i++) {
        Array.prototype.push.apply(bodyParts, body);
    }
    return bodyParts;
};
var spawnCreeps = function (spawn, bodyParts) {
    if (bodyParts.length == 0)
        return;
    if (spawn.spawning != null)
        return;
    var idx = Math.floor(Math.random() * bodyParts.length);
    var body = bodyParts[idx];
    var bod = getBodyDefinition(body, spawn.room.energyAvailable);
    if (bod.length == 0) {
        return;
    }
    console.log("Want to spawn ", bod);
    var err = spawn.createCreep(bod);
    if (err == 0) {
        bodyParts.splice(idx);
    }
    else {
        console.log(err);
    }
};
var TARGET_SCORE_HEAL = 5;
var TARGET_SCORE_ATTACK = 0;
var TARGET_SCORE_SHOOT = 3;
var scoreTarget = function (src, target) {
    var score = src.pos.getRangeTo(target);
    score += target.howManyParts(HEAL) * TARGET_SCORE_HEAL;
    score += target.howManyParts(ATTACK) * TARGET_SCORE_ATTACK;
    score += target.howManyParts(RANGED_ATTACK) * TARGET_SCORE_SHOOT;
    return score;
};
var targetAttactivenessCmp = function (tower) {
    return function (a, b) {
        return scoreTarget(tower, a) - scoreTarget(tower, b);
    };
};
var runTower = function (tower) {
    var enemies = tower.room.find(FIND_HOSTILE_CREEPS);
    if (enemies.length > 0) {
        enemies.sort(targetAttactivenessCmp(tower));
        tower.attack(enemies[0]);
        return;
    }
    var structures = tower.room.find(FIND_STRUCTURES);
    structures.sort(function (a, b) { return a.hits - b.hits; });
    for (var _i = 0; _i < structures.length; _i++) {
        var s = structures[_i];
        if (needsRepair(s)) {
            tower.repair(s);
            break;
        }
    }
};
var cpuOverBudget = function () {
    return ((Game.cpu.bucket < 5000 && Game.cpu.getUsed() > 100) ||
        (Game.cpu.bucket < 2000 && Game.cpu.getUsed() > 30) ||
        (Game.cpu.bucket < 1000 && Game.cpu.getUsed() > 10) ||
        Game.cpu.bucket < 100);
};
var runStructures = function (jobs) {
    for (var _i = 0, _a = Object.keys(Game.rooms); _i < _a.length; _i++) {
        var roomName = _a[_i];
        var room = Game.rooms[roomName];
        for (var _b = 0, _c = room.find(FIND_MY_STRUCTURES); _b < _c.length; _b++) {
            var struct = _c[_b];
            switch (struct.structureType) {
                case STRUCTURE_TOWER:
                    runTower(struct);
                    break;
                case STRUCTURE_SPAWN:
                    runSpawn(struct, jobs);
                    break;
            }
        }
    }
};
var memJobs = loadJobs();
var addJob = function (job) {
    if (memJobs.length > MAX_JOBS && job.priority != Priority.HIGH) {
        return;
    }
    memJobs.push(job);
};
var removeJob = function (job) {
    var idx = memJobs.indexOf(job);
    if (idx < 0)
        return;
    memJobs.splice(idx, 1);
};
if (!e(memJobs)) {
    memJobs = [];
}
var preJobTs = Game.cpu.getUsed();
console.log(preJobTs);
runStructures(memJobs);
doJobs(memJobs);
createJobs(memJobs);
saveJobs(memJobs);
var postJobTs = Game.cpu.getUsed();
console.log(postJobTs - preJobTs);
Game.Roles = Roles;
var clk = Game.flags['Clock'];
if (e(clk))
    clk.setColor(clk.color == COLOR_WHITE ? COLOR_GREY : COLOR_WHITE);
Game.listJobs = function () {
    for (var _i = 0; _i < memJobs.length; _i++) {
        var job = memJobs[_i];
        console.log(job.name, job.creep.name, job.target);
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9qb2JzLnRzIiwiLi4vdjMvdXRpbHMudHMiLCIuLi92My9hc3NpZ25fam9icy50cyIsIi4uL3YzL2NyZWF0ZV9qb2JzLnRzIiwiLi4vdjMvcm9sZXMudHMiLCIuLi92My9zcGF3bi50cyIsIi4uL3YzL3Rvd2VyLnRzIiwiLi4vdjMvbWFpbi50cyJdLCJuYW1lcyI6WyJTdXBlckNyZWVwIiwiU3VwZXJDcmVlcC5jb25zdHJ1Y3RvciIsIlN1cGVyQ3JlZXAuaG93TWFueVBhcnRzIiwiU3VwZXJDcmVlcC5oYXNQYXJ0IiwiU3VwZXJDcmVlcC5jYW5Nb3ZlIiwiU3VwZXJDcmVlcC5jYW5Xb3JrIiwiU3VwZXJDcmVlcC5jYW5IZWFsIiwiU3VwZXJDcmVlcC5jYW5BdHRhY2siLCJTdXBlckNyZWVwLmNhblNob290IiwiU3VwZXJDcmVlcC5jYW5DbGFpbSIsIlN1cGVyQ3JlZXAubG9nIiwiYXBwbHlNaXhpbnMiLCJQcmlvcml0eSIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQUFBLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQTtBQWVYO0lBQUFBO0lBZ0RBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxD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QSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxTQUFTQSxDQUFDQTtnQkFDckNBLE1BQU1BLENBQUNBLFdBQVdBLENBQUNBLENBQUNBLEVBQUVBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO1lBQ2hDQSxNQUFNQSxDQUFDQSxXQUFXQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtZQUM3QkEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsRUFBRUEsR0FBR0EsR0FBR0EsR0FBR0EsTUFBTUEsQ0FBQ0EsV0FBV0EsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsQ0FBQ0E7UUFDbkRBLENBQUNBO1FBRURBLElBQUlBLENBQUNBLE1BQU1BLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBLENBQUFBO1FBQzVCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFBQTtRQUM5QkEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQUE7UUFDOUJBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFVBQVVBLENBQUNBLElBQUlBLFFBQVFBLENBQUNBLE1BQU1BLENBQUFBO1FBRW5EQSxFQUFFQSxDQUFDQSxDQUFDQSxJQUFJQSxDQUFDQSxPQUFPQSxJQUFJQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQTtZQUM1QkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EscUJBQXFCQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFBQTtZQUM5Q0EsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQUE7WUFDNUJBLE1BQU1BLElBQUlBLEtBQUtBLENBQUNBLFVBQVVBLEdBQUNBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUFBO1FBQ3pDQSxDQUFDQTtJQUNMQSxD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QUFDdEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ2YsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBRW5CLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUNqQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxDQUFBO0FBRWpDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0FBRWxCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDN0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLFdBQVcsR0FBRyxVQUFVLEdBQUcsV0FBVyxDQUFDLENBQUE7QUFHN0UsSUFBSSxDQUFDLFFBQVEsR0FBRztJQUNaLEdBQUcsQ0FBQyxDQUFZLFVBQU8sRUFBbEIsbUJBQU8sRUFBUCxJQUFrQixDQUFDO1FBQW5CLElBQUksR0FBRyxHQUFJLE9BQU8sSUFBWDtRQUNSLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7S0FDcEQ7QUFDTCxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgVkVSID0gMVxuXG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwic2NyZWVwcy5kLnRzXCIgLz5cblxuaW50ZXJmYWNlIFBvc2l0aW9uRW50aXR5IHtcbiAgICBwb3M6IFJvb21Qb3NpdGlvblxuICAgIGlkOiBzdHJpbmdcbi8vICAgIHRyYW5zZmVyRW5lcmd5KGNyZWVwOiBDcmVlcCk6IG51bWJlcjtcbiAgICByb29tOiBSb29tXG59XG5cbmludGVyZmFjZSBTY3JlZXAgZXh0ZW5kcyBDcmVlcCwgU3VwZXJDcmVlcHtcbiAgICBqb2I/IDogSm9iO1xufVxuXG5jbGFzcyBTdXBlckNyZWVwIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZW5lcmd5OiBudW1iZXI7XG4gICAgYm9keToge1xuXG4gICAgICAgIC8qKiBPbmUgb2YgdGhlIGJvZHkgcGFydHMgY29uc3RhbnRzLiAqL1xuICAgICAgICB0eXBlOiBzdHJpbmc7XG5cbiAgICAgICAgLyoqIFRoZSByZW1haW5pbmcgYW1vdW50IG9mIGhpdCBwb2ludHMgb2YgdGhpcyBib2R5IHBhcnQuICovXG4gICAgICAgIGhpdHM6IG51bWJlclxuXG4gICAgfVtdO1xuXG4gICAgaG93TWFueVBhcnRzKHBhcnQ6c3RyaW5nKTpudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuYm9keS5maWx0ZXIocyA9PiB7IHJldHVybiAocy50eXBlID09IHBhcnQgJiYgcy5oaXRzID4gMCkgfSkubGVuZ3RoIFxuICAgIH1cblxuICAgIGhhc1BhcnQocGFydDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdGhpcy5ob3dNYW55UGFydHMocGFydCkgPiAwXG4gICAgfVxuXG4gICAgY2FuTW92ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChNT1ZFKTtcbiAgICB9XG5cbiAgICBjYW5Xb3JrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KFdPUkspO1xuICAgIH1cblxuICAgIGNhbkhlYWwoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoSEVBTCk7XG4gICAgfVxuXG4gICAgY2FuQXR0YWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KEFUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuU2hvb3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoUkFOR0VEX0FUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuQ2xhaW0oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoQ0xBSU0pO1xuICAgIH1cblxuICAgIGxvZyguLi5tc2cpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJbXCIrdGhpcy5uYW1lK1wiXVwiLCAuLi5tc2cpXG4gICAgfVxufVxuXG5cblxuXG5mdW5jdGlvbiBhcHBseU1peGlucyhkZXJpdmVkQ3RvcjogYW55LCBiYXNlQ3RvcnM6IGFueVtdKSB7XG4gICAgYmFzZUN0b3JzLmZvckVhY2goYmFzZUN0b3IgPT4ge1xuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlQ3Rvci5wcm90b3R5cGUpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgICBkZXJpdmVkQ3Rvci5wcm90b3R5cGVbbmFtZV0gPSBiYXNlQ3Rvci5wcm90b3R5cGVbbmFtZV07XG4gICAgICAgIH0pXG4gICAgfSk7IFxufVxuXG5cbmFwcGx5TWl4aW5zKENyZWVwLCBbU3VwZXJDcmVlcF0pXG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdsb2JhbHMudHNcIiAvPlxuXG5jb25zdCBKT0JfQ09NUExFVEUgPSA5OTlcbmNvbnN0IEVfQ1JBU0ggPSAtOTlcbmNvbnN0IEVSUl9MT1dfQ1BVID0gLTUwXG5cbmVudW0gUHJpb3JpdHkge0xPVz0wLCBOT1JNQUw9MSwgSElHSD0zfVxuXG5jbGFzcyBKb2J7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHRhcmdldDogU3RydWN0dXJlIHwgQ29uc3RydWN0aW9uU2l0ZSB8IEVuZXJneSB8IFBvc2l0aW9uRW50aXR5IHwgU291cmNlO1xuICAgIGpvYkZ1bmM6IEpvYkZ1bmM7XG4gICAgY3JlZXA6IFNjcmVlcDsgLy8gU2V0IGR1cmluZyBleGVjdXRpb25nXG4gICAgYm9keVJlcTogQm9keVBhcnRbXVxuICAgIHByaW9yaXR5OiBQcmlvcml0eVxuXG4gICAgY29uc3RydWN0b3Iob3B0cyA9IHt9KSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG9wdHNbJ25hbWUnXVxuXG4gICAgICAgIHZhciBucCA9IG9wdHNbJ25hbWVQcmVmaXgnXVxuICAgICAgICBpZiAobnAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoTWVtb3J5W1wiam9iQ291bnRzXCJdID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl0gPSB7fTtcbiAgICAgICAgICAgIGlmIChNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdID0gMDtcbiAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gKz0gMTtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5wICsgXCJfXCIgKyBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50YXJnZXQgPSBvcHRzWyd0YXJnZXQnXVxuICAgICAgICB0aGlzLmpvYkZ1bmMgPSBvcHRzWydqb2JGdW5jJ11cbiAgICAgICAgdGhpcy5ib2R5UmVxID0gb3B0c1snYm9keVJlcSddXG4gICAgICAgIHRoaXMucHJpb3JpdHkgPSBvcHRzWydwcmlvcml0eSddIHx8IFByaW9yaXR5Lk5PUk1BTFxuXG4gICAgICAgIGlmICh0aGlzLmJvZHlSZXEgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJhZCBqb2IhISwgbm8gYm9keSBcIiArIHRoaXMubmFtZSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG9wdHNbJ2JvZHlSZXEnXSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJhZCBqb2I9XCIrdGhpcy5uYW1lKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdG9KU09OKCkge1xuICAgICAgICB0cnl7XG4gICAgICAgICAgICB2YXIgam9iRm46IGFueSA9IHRoaXMuam9iRnVuYztcbiAgICAgICAgICAgIHZhciByZXQgPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcy50YXJnZXQuaWQsXG4gICAgICAgICAgICAgICAgam9iRnVuYzogUm9sZXNSZXZlcnNlW2pvYkZuXSxcbiAgICAgICAgICAgICAgICBib2R5UmVxOiB0aGlzLmJvZHlSZXEsXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IHRoaXMucHJpb3JpdHlcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gcmV0XG4gICAgICAgIH0gY2F0Y2goZXgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgY29udmVydGluZyBzdHJ1Y3QgdG8ganNvbiBmb3I6ICBcIiArICB0aGlzLm5hbWUpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhleC5zdGFjaykgICAgXG4gICAgICAgIH1cbiAgICB9XG59XG52YXIgcGFyc2VKb2IgPSAoazogc3RyaW5nLCB2KTogYW55ID0+IHtcbiAgICBzd2l0Y2ggKGspIHtcbiAgICAgICAgY2FzZSAndGFyZ2V0JzogXG4gICAgICAgIHZhciByID0gR2FtZS5nZXRPYmplY3RCeUlkKHYpXG4gICAgICAgIGlmIChyID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJGQUlMRUQgVE8gTE9BRCBcIiArIGsgKyBcIiBmcm9tIFwiICsgdilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2pvYkZ1bmMnOiBcbiAgICAgICAgcmV0dXJuIFJvbGVzW3ZdO1xuICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnJzogXG4gICAgICAgIHJldHVybiB2Lm1hcChvPT4geyByZXR1cm4gbmV3IEpvYihvKSB9KVxuICAgIH1cbiAgICByZXR1cm4gdlxufVxuXG52YXIgc2V0Sm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiB7XG4gICAgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXSA9IGNyZWVwLm5hbWU7XG4gICAgam9iLmNyZWVwID0gY3JlZXA7XG4gICAgY3JlZXAuam9iID0gam9iO1xufVxuXG52YXIgY2xlYXJKb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpID0+IHtcbiAgICBpZiAoam9iICE9IG51bGwgICYmIGpvYiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgZGVsZXRlIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgICAgIGRlbGV0ZSBqb2IuY3JlZXBcbiAgICB9XG4gICAgaWYgKGUoY3JlZXApKVxuICAgICAgICBkZWxldGUgY3JlZXAuam9iXG4gICAgcmVtb3ZlSm9iKGpvYilcbn1cblxudmFyIGxvYWRDcmVlcEpvYnMgPSAoam9iczogSm9iW10pOiB7IFtpbmRleDogc3RyaW5nXTogYm9vbGVhbiB9ID0+IHtcbiAgICB2YXIgc2VlbkpvYnM6IHsgW2luZGV4OiBzdHJpbmddOiBib29sZWFuIH0gPSB7fVxuICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgIGlmIChzZWVuSm9ic1tqb2IubmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRFVQTElDQVRFIEpPQiBJTiBMSVNUISEgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgfVxuICAgICAgICBzZWVuSm9ic1tqb2IubmFtZV0gPSB0cnVlXG4gICAgICAgIHZhciBjcmVlcE5hbWU6IHN0cmluZyA9IE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgICAgIHZhciBjcmVlcDogU2NyZWVwID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoY3JlZXBOYW1lICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3JlZXAgPSBHYW1lLmNyZWVwc1tjcmVlcE5hbWVdXG4gICAgICAgICAgICBpZiAoam9iLnRhcmdldCA9PSB1bmRlZmluZWQgfHwgam9iLnRhcmdldCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdGFydCBkaXNhcHBlYXJlZCBmb3IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgam9iKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoam9iLnRhcmdldCA9PSB1bmRlZmluZWQgfHwgam9iLnRhcmdldCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdGFydCBkaXNhcHBlYXJlZCBmb3IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgICAgICBjbGVhckpvYihudWxsLCBqb2IpXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAgPT0gdW5kZWZpbmVkIHx8IGNyZWVwID09IG51bGwpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBNZW1vcnlbJ2pvYl93b3JrZXJzJ11bam9iLm5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGNsZWFuSm9icyhqb2JzLCBzZWVuSm9icylcbiAgICByZXR1cm4gc2VlbkpvYnNcbn1cblxudmFyIGNsZWFuSm9icyA9IChqb2JzOiBKb2JbXSwgc2VlbkpvYnM6IHsgW2luZGV4OiBzdHJpbmddOiBib29sZWFuIH0pID0+e1xuICAgIC8vIENsZWFuIHVwIGpvYiB3b3JrZXJzXG4gICAgZm9yICh2YXIgam9iTmFtZSBvZiBPYmplY3Qua2V5cyhNZW1vcnlbJ2pvYl93b3JrZXJzJ10pKSB7XG4gICAgICAgIHZhciBjcmVlcE5hbWU6IHN0cmluZyA9IE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2JOYW1lXTtcbiAgICAgICAgaWYgKHNlZW5Kb2JzW2pvYk5hbWVdICE9PSB0cnVlIHx8ICFlKEdhbWUuY3JlZXBzW2NyZWVwTmFtZV0pKSB7XG4gICAgICAgICAgICBjbGVhckpvYihHYW1lLmNyZWVwc1tjcmVlcE5hbWVdLCBqb2IpXG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgaWYoIWUoam9iLnRhcmdldCkpIHtcbiAgICAgICAgICAgIGNsZWFySm9iKGpvYi5jcmVlcCwgam9iKVxuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgcnVuQWxsSm9icyA9IChjcmVlcHM6IFNjcmVlcFtdKSA9PiB7XG4gICAgZm9yICh2YXIgY3JlZXAgb2YgY3JlZXBzKSB7XG4gICAgICAgIGlmIChlKGNyZWVwLmpvYikpIHtcbiAgICAgICAgICAgIHZhciBqb2JOYW1lID0gY3JlZXAuam9iLm5hbWVcbiAgICAgICAgICAgIHZhciBlcnIgPSBydW5Kb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvL2NyZWVwLmxvZyhcIk5vdGhpbmcgdG8gZG9cIilcbiAgICAgICAgICAvLyBUT0RPOiBDb3VudCAjIG9mIGlkbGUgYm90cywgZXZlbnR1YWxseSBjdWxsIHdlYWsvb2xkIG9uZXNcbiAgICAgICAgICBpZiAoR2FtZS5mbGFnc1snSWRsZSddICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjcmVlcC5tb3ZlVG8oR2FtZS5mbGFnc1snSWRsZSddKVxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfVxufVxuXG52YXIgZGlzcGxheU5hbWUgPSAoczogU3RydWN0dXJlIHwgQ29uc3RydWN0aW9uU2l0ZSB8IEVuZXJneSB8IFBvc2l0aW9uRW50aXR5KTpTdHJpbmcgPT4ge1xuICAgIHJldHVybiBuZXcgU3RyaW5nKHMpXG59XG5cblxudmFyIHJ1bkpvYiA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgaWYoam9iLnByaW9yaXR5ICE9IFByaW9yaXR5LkhJR0ggJiYgY3B1T3ZlckJ1ZGdldCgpKSB7XG4gICAgICAgIHJldHVybiBFUlJfTE9XX0NQVVxuICAgIH1cbiAgICB2YXIgcmV0XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0ID0gY3JlZXAuam9iLmpvYkZ1bmMoY3JlZXAsIGNyZWVwLmpvYilcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNyYXNoIHJ1bm5pbmcgam9iIFwiICsgY3JlZXAuam9iLm5hbWUgKyBcIiBhbmQgbXNnIFwiICsgZXgpXG4gICAgICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxuICAgICAgICByZXQgPSBFX0NSQVNIXG4gICAgfVxuICAgIHN3aXRjaCAocmV0KSB7XG4gICAgICAgIGNhc2UgSk9CX0NPTVBMRVRFOiB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJDb21wbGV0ZSEgam9iPVwiICsgam9iLm5hbWUgKyBcIiB0YXJnZXQ9XCIgKyBkaXNwbGF5TmFtZShqb2IudGFyZ2V0KSlcbiAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgRVJSX05PX1BBVEg6IFxuICAgICAgICBjYXNlIEVfQ1JBU0g6IFxuICAgICAgICBjYXNlIEVSUl9OT1RfRk9VTkQ6IFxuICAgICAgICBjYXNlIEVSUl9JTlZBTElEX1RBUkdFVDogXG4gICAgICAgIGNhc2UgRVJSX0ZVTEw6IFxuICAgICAgICBjYXNlIEVSUl9JTlZBTElEX0FSR1M6IFxuICAgICAgICBjYXNlIEVSUl9OT1RfT1dORVI6XG4gICAgICAgIGNhc2UgRVJSX05PVF9FTk9VR0hfUkVTT1VSQ0VTOiBcbiAgICAgICAgY3JlZXAubG9nKFwiRmFpbGVkISEgam9iPVwiICsgam9iLm5hbWUgKyBcIiBlcnI9XCIgKyByZXQgKyBcIiB0YXJnZXQ9XCIgKyBkaXNwbGF5TmFtZShqb2IudGFyZ2V0KSlcbiAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAwOiBcbiAgICAgICAgY2FzZSBFUlJfVElSRUQ6IFxuICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OiBcbiAgICB9XG4gICAgcmV0dXJuIHJldFxufVxuXG5jb25zdCBNQVhfSk9CUyA9IDIwMFxuLy8gVE9ETzogQVBJIHRvIGFkZCBqb2JzLCBzb21lIHdheSB0byBjb21iaW5lIGluLW1lbW9yeSBqb2JzIHdpdGggaW4tY29kZSBqb2JzXG4vLyBmaXRuZXNzIGZ1bmMgZm9yIGNhbmRpZGF0ZXMgYmFzZWQgb24gZGlzdGFuY2UuXG5cbnZhciBkb0pvYnMgPSAoam9iczogSm9iW10pID0+IHtcbiAgICBpZiAoTWVtb3J5Wydqb2Jfd29ya2VycyddID09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlcGxhY2luZyB3b3JrZXIgbWFwMSEhXCIpXG4gICAgICAgIE1lbW9yeVsnam9iX3dvcmtlcnMnXSA9IHt9XG4gICAgfVxuICAgIHZhciBjcmVlcHM6IFNjcmVlcFtdID0gW11cbiAgICBmb3IgKHZhciBuIG9mIE9iamVjdC5rZXlzKEdhbWUuY3JlZXBzKSkge1xuICAgICAgICBpZiAoR2FtZS5jcmVlcHNbbl0uc3Bhd25pbmcpIGNvbnRpbnVlO1xuICAgICAgICBjcmVlcHMucHVzaChHYW1lLmNyZWVwc1tuXSlcbiAgICB9XG5cbiAgICBsb2FkQ3JlZXBKb2JzKGpvYnMpXG4gICAgYXNzaWduQWxsSm9icyhjcmVlcHMsIGpvYnMpXG4gICAgcnVuQWxsSm9icyhjcmVlcHMpXG4gICAgLy8gTG9vayB1cCBqb2IgbGlua2FnZXMgZnJvbSBNZW1vcnkgYW5kIHVwZGF0ZSBHYW1lLmNyZWVwIGFuZCBqb2JzIHZhcmlhYmxlcyB0byBoYXZlIGxpbmtzLlxuICAgIC8vIFRPRE86IENsZWFuIHVwIE1lbW9yeS5jcmVlcHNcbn1cblxudmFyIGxvYWRKb2JzID0gKCk6IEpvYltdID0+IHtcbiAgICB2YXIgam9iczogSm9iW11cbiAgICB0cnkge1xuICAgICAgICB2YXIgam9ic0pTT04gPSBNZW1vcnlbXCJqb2JzXCJdO1xuICAgICAgICBpZiAoam9ic0pTT04gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBqb2JzID0gSlNPTi5wYXJzZShqb2JzSlNPTiwgcGFyc2VKb2IpXG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHBhcnNpbmcgaW4gbWVtb3J5IGpvYnMhOiBcIiArIGV4ICsgXCJcXG4gIFwiICsgTWVtb3J5W1wiam9ic1wiXSlcbiAgICAgICAgY29uc29sZS5sb2coZXguc3RhY2spXG4gICAgfVxuICAgIHJldHVybiBqb2JzXG59XG5cbnZhciBzYXZlSm9icyA9IChqb2JzOiBKb2JbXSkgPT4ge1xuICAgIE1lbW9yeVtcImpvYnNcIl0gPSBKU09OLnN0cmluZ2lmeShqb2JzKVxufVxuIiwiXG52YXIgZSA9IChvKTogYm9vbGVhbiA9PiB7XG4gIHJldHVybiBvICE9IG51bGwgJiYgbyAhPSB1bmRlZmluZWRcbn1cblxudmFyIHJvb21Db250cm9sbGVkQnlNZSA9IChyb29tOiBSb29tKTogYm9vbGVhbiA9PiB7XG4gICAgaWYgKHJvb20gPT0gdW5kZWZpbmVkIHx8IHJvb20uY29udHJvbGxlciA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuICAgIGlmIChyb29tLmNvbnRyb2xsZXIub3duZXIgIT0gdW5kZWZpbmVkICYmIHJvb20uY29udHJvbGxlci5vd25lci51c2VybmFtZSA9PSAnb21nYmVhcicpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgaWYgKHJvb20uY29udHJvbGxlci5yZXNlcnZhdGlvbiAhPSB1bmRlZmluZWQgJiYgcm9vbS5jb250cm9sbGVyLnJlc2VydmF0aW9uLnVzZXJuYW1lID09ICdvbWdiZWFyJykge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2Vcbn1cblxudmFyIG93bmVkQnlNZSA9IChzdHJ1Y3Q6IFN0cnVjdHVyZSk6IGJvb2xlYW4gPT4ge1xuICAgIGlmIChzdHJ1Y3Qub3duZXIgJiYgc3RydWN0Lm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJyl7XG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICAgIHJldHVybiByb29tQ29udHJvbGxlZEJ5TWUoc3RydWN0LnJvb20pXG59XG5cbnZhciBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zID0gKHN0cnVjdFR5cGVzOiBzdHJpbmdbXSk6IFN0cnVjdHVyZVtdID0+IHtcbiAgICB2YXIgc3RydWN0cyA9IFtdXG4gICAgZm9yICh2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgc3RydWN0cy5wdXNoLmFwcGx5KGdldE15U3RydWN0dXJlc0luUm9vbShyb29tTmFtZSwgc3RydWN0VHlwZXMpKVxuICAgIH1cbiAgICByZXR1cm4gc3RydWN0cztcbn1cblxudmFyIG5lZWRzRW5lcmd5ID0gKHM6IFN0cnVjdHVyZSB8IENvbnN0cnVjdGlvblNpdGUpOiBib29sZWFuID0+IHtcbiAgaWYgKHMuY29uc3RydWN0b3IgPT0gQ29uc3RydWN0aW9uU2l0ZSkge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbiAgICBzd2l0Y2ggKHMuc3RydWN0dXJlVHlwZSkge1xuICAgICAgICBjYXNlIFNUUlVDVFVSRV9TVE9SQUdFOiBcbiAgICAgICAgcmV0dXJuICg8U3RvcmFnZT5zKS5zdG9yZS5lbmVyZ3kgPCAoPFN0b3JhZ2U+cykuc3RvcmVDYXBhY2l0eTtcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfVE9XRVI6IFxuICAgICAgICByZXR1cm4gKDxUb3dlcj5zKS5lbmVyZ3kgPCAoPFRvd2VyPnMpLmVuZXJneUNhcGFjaXR5ICogLjk1XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOOlxuICAgICAgICBjYXNlIFNUUlVDVFVSRV9FWFRFTlNJT046XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX0xJTks6XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1BPV0VSX1NQQVdOOlxuICAgICAgICByZXR1cm4gKDxFbmVyZ3lIb2xkZXI+cykuZW5lcmd5IDwgKDxFbmVyZ3lIb2xkZXI+cykuZW5lcmd5Q2FwYWNpdHlcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfQ09OVFJPTExFUjpcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgY29uc29sZS5sb2coXCJ1bmtub3duIHN0cnVjdCBuZWVkcyBlbmVyZ3lcIiArIHMpXG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBnZXRNeVN0cnVjdHVyZXNJblJvb20gPSAocm9vbU5hbWU6IHN0cmluZywgc3RydWN0VHlwZXM6IHN0cmluZ1tdKTogU3RydWN0dXJlW10gPT4ge1xuICAgIHZhciByb29tOiBSb29tID0gR2FtZS5yb29tc1tyb29tTmFtZV1cbiAgICBpZiAocm9vbSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVE9ETzogTG9nP1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNhbid0IGZpbmQgcm9vbSBcIiArIHJvb21OYW1lKVxuICAgICAgICByZXR1cm4gW11cbiAgICB9XG4gICAgaWYgKHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdID09IHVuZGVmaW5lZCkge1xuICAgICAgICByb29tW1wibXlfc3RydWN0dXJlc1wiXSA9IHJvb20uZmluZChGSU5EX01ZX1NUUlVDVFVSRVMpXG4gICAgfVxuICAgIHJldHVybiByb29tW1wibXlfc3RydWN0dXJlc1wiXS5maWx0ZXIocz0+IHsgcmV0dXJuIHN0cnVjdFR5cGVzLmluZGV4T2Yocy5zdHJ1Y3R1cmVUeXBlKSA+IC0xIH0pXG59XG5cblxudmFyIG5lZWRzUmVwYWlyID0gKHM6IFN0cnVjdHVyZSk6IGJvb2xlYW4gPT4ge1xuICAgIGlmIChzLnN0cnVjdHVyZVR5cGUgPT0gU1RSVUNUVVJFX1dBTEwpIHtcbiAgICAgICAgcmV0dXJuIHMuaGl0cyA8IE1hdGgubWluKHMuaGl0c01heCwgMTAwMDApXG4gICAgfVxuICAgIGlmIChzLnN0cnVjdHVyZVR5cGUgPT0gU1RSVUNUVVJFX1JBTVBBUlQpIHtcbiAgICAgICAgcmV0dXJuIHMuaGl0cyA8IE1hdGgubWluKHMuaGl0c01heCwgMTAwMDApXG4gICAgfVxuICAgIHJldHVybiBzLmhpdHMgPCBzLmhpdHNNYXhcbn1cblxudmFyIGhhc0VuZXJneSA9IChzKSA9PiB7XG4gICAgaWYgKHMuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5hbW91bnQgPiA1MDtcbiAgICB9XG4gICAgaWYgKHMuc3RvcmUgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLnN0b3JlLmVuZXJneSA+IDUwMDtcbiAgICB9XG4gICAgaWYgKHMuY2FycnkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmNhcnJ5LmVuZXJneSA+IDBcbiAgICB9XG4gICAgaWYgKHMuZW5lcmd5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5lbmVyZ3kgPiAwXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxufVxuXG52YXIgdGFyZ2V0SW5TYW1lT3JOZXdSb29tID0gKHJvb21OYW1lOiBzdHJpbmcpOiBKb2JGaWx0ZXIgPT4ge1xuICAgIHJldHVybiAoam9iOiBKb2IpOiBib29sZWFuID0+IHtcbiAgICAgICAgcmV0dXJuIChlKGpvYi50YXJnZXQpICYmICghZShqb2IudGFyZ2V0LnJvb20pIHx8ICFlKGpvYi50YXJnZXQucm9vbS5zdG9yYWdlKSB8fCBqb2Iuam9iRnVuYyA9PSBSb2xlc1snbWVnYU1pbmVyJ10gfHwgam9iLnRhcmdldC5wb3Mucm9vbU5hbWUgPT0gcm9vbU5hbWUpKVxuICAgIH1cbn0iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwic2NyZWVwcy5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJnbG9iYWxzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJqb2JzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJ1dGlscy50c1wiIC8+XG5cbnZhciBjYW5Eb0pvYkZpbHRlciA9IChjcmVlcDogU2NyZWVwKTogSm9iRmlsdGVyID0+IHtcbiAgcmV0dXJuIChqb2I6IEpvYik6IGJvb2xlYW4gPT4ge1xuICAgIGZvciAodmFyIG5lZWRlZFBhcnQgb2Ygam9iLmJvZHlSZXEpIHtcbiAgICAgIHZhciBmb3VuZCA9IGZhbHNlXG4gICAgICBmb3IgKHZhciBib2R5UGFydCBvZiBjcmVlcC5ib2R5KSB7XG4gICAgICAgIGlmIChib2R5UGFydC50eXBlID09IG5lZWRlZFBhcnQpIHtcbiAgICAgICAgICBmb3VuZCA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWZvdW5kKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG59XG5cbnZhciBub0NyZWVwQXNzaWduZWQgPSAoam9iOiBKb2IpOiBib29sZWFuID0+IHtcbiAgcmV0dXJuIGpvYi5jcmVlcCA9PSB1bmRlZmluZWRcbn1cblxudmFyIHNvcnRKb2JzQnlSYW5nZSA9IChwb3M6IFJvb21Qb3NpdGlvbiwgcG9zc2libGVKb2JzOiBKb2JbXSkgPT4ge1xuICB2YXIgZGlzdGFuY2VDYWNoZSA9IHt9XG4gIHBvc3NpYmxlSm9icy5zb3J0KChhOiBKb2IsIGI6IEpvYik9PntcbiAgICBpZihkaXN0YW5jZUNhY2hlW2EudGFyZ2V0LmlkXSA9PSB1bmRlZmluZWQpIHtcbiAgICAgIGRpc3RhbmNlQ2FjaGVbYS50YXJnZXQuaWRdID0gcG9zLmdldFJhbmdlVG8oYS50YXJnZXQpIC0gKGEucHJpb3JpdHkgKiAyMClcbiAgICB9XG4gICAgaWYoZGlzdGFuY2VDYWNoZVtiLnRhcmdldC5pZF0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICBkaXN0YW5jZUNhY2hlW2IudGFyZ2V0LmlkXSA9IHBvcy5nZXRSYW5nZVRvKGIudGFyZ2V0KSAtIChiLnByaW9yaXR5ICogMjApXG4gICAgfVxuICAgIHJldHVybiBkaXN0YW5jZUNhY2hlW2EudGFyZ2V0LmlkXSAtIGRpc3RhbmNlQ2FjaGVbYi50YXJnZXQuaWRdXG4gIH0pICAgIFxufVxuXG52YXIgZmluZEJlc3RKb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iczogSm9iW10pOiBKb2IgPT4ge1xuICB2YXIgcG9zc2libGVKb2JzOiBKb2JbXSA9IChqb2JzXG4gICAgLmZpbHRlcihub0NyZWVwQXNzaWduZWQpXG4gICAgLmZpbHRlcih0YXJnZXRJblNhbWVPck5ld1Jvb20oY3JlZXAucG9zLnJvb21OYW1lKSlcbiAgICAuZmlsdGVyKGNhbkRvSm9iRmlsdGVyKGNyZWVwKSkpXG4gICAgLy8gVE9ETzogSWYgam9iIHJlcXVpcmVzIGVuZXJneSwgdGFrZSB0aGF0IGluIHRvIGFjY291bnQgd2hlbiBzb3J0aW5nXG4gICAgc29ydEpvYnNCeVJhbmdlKGNyZWVwLnBvcywgcG9zc2libGVKb2JzKVxuICAgIC8vIFRPRE86IHNvcnQgYnkgYm9keS1maXRcbiAgICAvLyBUT0RPOiBzb3J0IGJ5IGN1cnJlbnQgZW5lcmd5IGxldmVsXG4gICAgaWYgKHBvc3NpYmxlSm9icy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gcG9zc2libGVKb2JzWzBdXG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICB2YXIgYXNzaWduQWxsSm9icyA9IChjcmVlcHM6IFNjcmVlcFtdLCBqb2JzOiBKb2JbXSkgPT4ge1xuICAgIGNyZWVwcy5zb3J0KChhOkNyZWVwLGI6Q3JlZXApOm51bWJlcj0+IHtyZXR1cm4gYi5ib2R5Lmxlbmd0aCAtIGEuYm9keS5sZW5ndGh9KVxuICAgIGZvciAodmFyIGNyZWVwIG9mIGNyZWVwcykge1xuICAgICAgaWYgKGNyZWVwLnNwYXduaW5nKSBjb250aW51ZTtcbiAgICAgIGlmKCFlKGNyZWVwLmpvYikgfHwgIWUoY3JlZXAuam9iLnRhcmdldCkpIHtcbiAgICAgICAgaWYgKCFlKGNyZWVwLmpvYikpIHtcbiAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICB9XG4gICAgICAgIHZhciBqb2I6IEpvYiA9IGZpbmRCZXN0Sm9iKGNyZWVwLCBqb2JzKVxuICAgICAgICBpZiAoZShqb2IpKSB7XG4gICAgICAgICAgY3JlZXAubWVtb3J5ID0ge31cbiAgICAgICAgICBzZXRKb2IoY3JlZXAsIGpvYilcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2xvYmFscy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiam9icy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidXRpbHMudHNcIiAvPlxuXG5cblxuXG52YXIgbmV3RmlsbEpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5LCBwcmlvcml0eTogUHJpb3JpdHkgPSBQcmlvcml0eS5OT1JNQUwpOiBKb2IgPT4ge1xuICByZXR1cm4gbmV3IEpvYih7XG4gICAgbmFtZVByZWZpeDogJ2ZpbGwnLFxuICAgIHRhcmdldDogdGFyZ2V0LFxuICAgIGpvYkZ1bmM6IFJvbGVzWydmaWxsU3RydWN0J10sXG4gICAgYm9keVJlcTogW01PVkUsIENBUlJZLCBDQVJSWV0sXG4gICAgcHJpb3JpdHk6IHByaW9yaXR5LFxuICB9KVxufVxuXG52YXIgbmV3QnVpbGRKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gIHJldHVybiBuZXcgSm9iKHtcbiAgICBuYW1lUHJlZml4OiAnYnVpbGQnLFxuICAgIHRhcmdldDogdGFyZ2V0LFxuICAgIGpvYkZ1bmM6IFJvbGVzWydmaWxsU3RydWN0J10sXG4gICAgYm9keVJlcTogW01PVkUsIE1PVkUsIFdPUkssIENBUlJZXSxcbiAgfSlcbn1cblxudmFyIG5ld1VwZ3JhZGVKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gIHJldHVybiBuZXcgSm9iKHtcbiAgICBuYW1lUHJlZml4OiAndXBncmFkZScsXG4gICAgdGFyZ2V0OiB0YXJnZXQsXG4gICAgam9iRnVuYzogUm9sZXNbJ2ZpbGxTdHJ1Y3QnXSxcbiAgICBib2R5UmVxOiBbTU9WRSwgTU9WRSwgTU9WRSwgV09SSywgV09SSywgV09SSywgV09SSywgQ0FSUlksIENBUlJZXSxcbiAgfSlcbn1cblxudmFyIG5ld1JlcGFpckpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgIG5hbWVQcmVmaXg6ICdyZXBhaXInLFxuICAgIHRhcmdldDogdGFyZ2V0LFxuICAgIGpvYkZ1bmM6IFJvbGVzWydyZXBhaXInXSxcbiAgICBib2R5UmVxOiBbTU9WRSwgV09SSywgQ0FSUlldLFxuICB9KVxufVxuXG52YXIgbmV3TWluZXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gIHJldHVybiBuZXcgSm9iKHtcbiAgICBuYW1lUHJlZml4OiBcIm1pbmVyXCIsXG4gICAgdGFyZ2V0OiB0YXJnZXQsXG4gICAgam9iRnVuYzogUm9sZXNbJ21lZ2FNaW5lciddLFxuICAgIGJvZHlSZXE6IFtXT1JLLCBXT1JLLCBNT1ZFXSxcbiAgICBwcmlvcml0eTogUHJpb3JpdHkuSElHSCxcbiAgfSlcbn1cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG52YXIgY3JlYXRlSm9icyA9IChqb2JzKSA9PiB7XG4gIGNvbnN0IFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUgPSBbU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OLCBTVFJVQ1RVUkVfVE9XRVIsIFNUUlVDVFVSRV9DT05UUk9MTEVSXVxuICB2YXIgc3RydWN0dXJlcyA9IHt9XG4gIGZvciAodmFyIHJvb21OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUucm9vbXMpKSB7XG4gICAgdmFyIHJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXTtcbiAgICBjcmVhdGVKb2JzRm9yUm9vbShqb2JzLCByb29tKVxuICB9XG59XG5cbnZhciBqb2JzRm9yVGFyZ2V0ID0gKGpvYnM6IEpvYltdLCB0YXJnZXRJZDogc3RyaW5nKTogSm9iW10gPT4ge1xuICByZXR1cm4gam9icy5maWx0ZXIoaj0+e1xuICAgIHJldHVybiBqLnRhcmdldCAhPSBudWxsICYmIGoudGFyZ2V0LmlkID09IHRhcmdldElkXG4gIH0pXG59XG5cbnZhciBtYXliZUNyZWF0ZUZpbGxKb2IgPSAoam9iczogSm9iW10sIHN0cnVjdDogVG93ZXJ8U3Bhd258RXh0ZW5zaW9ufExpbmspID0+IHtcbiAgdmFyIGZpbGxlZFBlcmNlbnQgPSBzdHJ1Y3QuZW5lcmd5IC8gc3RydWN0LmVuZXJneUNhcGFjaXR5O1xuICBzd2l0Y2goc3RydWN0LnN0cnVjdHVyZVR5cGUpIHtcbiAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjogXG4gICAgaWYgKGZpbGxlZFBlcmNlbnQgPCAuOCkge1xuICAgICAgYWRkSm9iKG5ld0ZpbGxKb2Ioc3RydWN0KSlcbiAgICB9IGVsc2UgaWYgKGZpbGxlZFBlcmNlbnQgPCAuOSkge1xuICAgICAgYWRkSm9iKG5ld0ZpbGxKb2Ioc3RydWN0LCBQcmlvcml0eS5MT1cpKVxuICAgIH1cbiAgICBicmVhaztcbiAgICBkZWZhdWx0OiBcbiAgICBpZiAoZmlsbGVkUGVyY2VudCA8IDEpIHtcbiAgICAgIGFkZEpvYihuZXdGaWxsSm9iKHN0cnVjdCkpXG4gICAgfVxuICB9XG59XG5cbnZhciBjcmVhdGVKb2JzRm9yUm9vbSA9IChqb2JzOiBKb2JbXSwgcm9vbTogUm9vbSkgPT4ge1xuICByb29tLnN0cnVjdHVyZXMgPSA8U3RydWN0dXJlW10+cm9vbS5maW5kKEZJTkRfU1RSVUNUVVJFUylcblxuICBjcmVhdGVSZXNvdXJjZUdhdGhlcmluZ0pvYnMoam9icywgcm9vbSlcbiAgY3JlYXRlRmlsbEpvYnNGb3JSb29tKGpvYnMsIHJvb20pXG4gIGNyZWF0ZVJlcGFpckpvYnNGb3JSb29tKGpvYnMsIHJvb20pXG4gIGNyZWF0ZUNvbnN0cnV0aW9uSm9ic0ZvclJvb20oam9icywgcm9vbSlcbn1cblxudmFyIGNyZWF0ZUZpbGxKb2JzRm9yUm9vbSA9IChqb2JzOiBKb2JbXSwgcm9vbTogUm9vbSkgPT4ge1xuICBmb3IgKHZhciBzdHJ1Y3Qgb2Ygcm9vbS5zdHJ1Y3R1cmVzKSB7XG4gICAgaWYoIW93bmVkQnlNZShzdHJ1Y3QpKSB7XG4gICAgICBjb250aW51ZVxuICAgIH1cbiAgICB2YXIgam9ic0ZvclN0cnVjdCA9IGpvYnNGb3JUYXJnZXQoam9icywgc3RydWN0LmlkKVxuICAgIHN3aXRjaCAoc3RydWN0LnN0cnVjdHVyZVR5cGUpIHtcbiAgICAgIGNhc2UgU1RSVUNUVVJFX1RPV0VSOiBcbiAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOOiBcbiAgICAgIGNhc2UgU1RSVUNUVVJFX0VYVEVOU0lPTjoge1xuICAgICAgICBpZiAoam9ic0ZvclN0cnVjdC5sZW5ndGggPCAxKVxuICAgICAgICAgIG1heWJlQ3JlYXRlRmlsbEpvYihqb2JzLCA8VG93ZXJ8U3Bhd258RXh0ZW5zaW9uPnN0cnVjdClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGNhc2UgU1RSVUNUVVJFX1NUT1JBR0U6IHtcbiAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDwgNSlcbiAgICAgICAgICBhZGRKb2IobmV3RmlsbEpvYig8U3RvcmFnZT5zdHJ1Y3QsIFByaW9yaXR5LkxPVykpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjYXNlIFNUUlVDVFVSRV9DT05UUk9MTEVSOiB7XG4gICAgICAgIHZhciBjdHJsID0gPENvbnRyb2xsZXI+c3RydWN0XG4gICAgICAgIGlmIChyb29tLnN0b3JhZ2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHJvb20uc3RvcmFnZS5zdG9yZS5lbmVyZ3kgPiAxMDAwMCkge1xuICAgICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDwgMylcbiAgICAgICAgICAgICAgYWRkSm9iKG5ld1VwZ3JhZGVKb2IoY3RybCkpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGN0cmwubGV2ZWwgPCA1KSB7XG4gICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDwgNClcbiAgICAgICAgICAgIGFkZEpvYihuZXdVcGdyYWRlSm9iKGN0cmwpKVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbnZhciBjcmVhdGVSZXBhaXJKb2JzRm9yUm9vbSA9IChqb2JzOiBKb2JbXSwgcm9vbTogUm9vbSkgPT4ge1xuICBmb3IgKHZhciBzdHJ1Y3Qgb2Ygcm9vbS5zdHJ1Y3R1cmVzKSB7XG4gICAgaWYgKG93bmVkQnlNZShzdHJ1Y3QpICYmIG5lZWRzUmVwYWlyKHN0cnVjdCkpIHtcbiAgICAgIHZhciBqb2JFeGlzdHM6IGJvb2xlYW4gPSBmYWxzZVxuICAgICAgZm9yICh2YXIgaiBvZiBqb2JzKSB7XG4gICAgICAgIGlmIChqLmpvYkZ1bmMgPT0gUm9sZXNbJ3JlcGFpciddICYmIGoudGFyZ2V0LmlkID09IHN0cnVjdC5pZCkge1xuICAgICAgICAgIGpvYkV4aXN0cyA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIGlmIChqb2JFeGlzdHMpIHtcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWpvYkV4aXN0cykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlJlcGFpciBzaXRlOiBcIiArIHN0cnVjdC5pZClcbiAgICAgICAgYWRkSm9iKG5ld1JlcGFpckpvYihzdHJ1Y3QpKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG52YXIgY3JlYXRlQ29uc3RydXRpb25Kb2JzRm9yUm9vbSA9IChqb2JzOiBKb2JbXSwgIHJvb206IFJvb20pID0+IHtcbiAgdmFyIHJvb21TaXRlcyA9IDxDb25zdHJ1Y3Rpb25TaXRlW10+cm9vbS5maW5kKEZJTkRfTVlfQ09OU1RSVUNUSU9OX1NJVEVTKVxuICBmb3IgKHZhciBzaXRlIG9mIHJvb21TaXRlcykge1xuICAgIHZhciBqb2JzRm9yU2l0ZTogSm9iW10gPSBqb2JzRm9yVGFyZ2V0KGpvYnMsIHNpdGUuaWQpXG4gICAgICAvLyB0b2RvIG9ubHkgcmVwYWlyIHdhbGxzIGluIG15cm9vbXNcbiAgICAgIC8vIHRyYWNrIGJ1aWxkcmVycyBvbiBhbGwgc2l0ZXMgLS0gbWF5YmUgYSBjb25zdHJ1Y3Rpb24gZm9yZW1hbiBzbyB3ZSBkb250IHNwYXduIHRvbnMgb2Ygam9icyBhbmRcbiAgICAgIGNvbnN0IEJVSUxERVJTX1BFUl9TSVRFID0gMlxuICAgICAgLy8gYnVpbGRlcnMgc2hvdWxkIGRlcGVuZCBvbiByZW1haW5pbmcgZW5lcmd5IG5lZWRlZFxuICAgICAgaWYgKGpvYnNGb3JTaXRlLmxlbmd0aCA8IEJVSUxERVJTX1BFUl9TSVRFKSB7XG4gICAgICAgIGFkZEpvYihuZXdCdWlsZEpvYihzaXRlKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG52YXIgY3JlYXRlUmVzb3VyY2VHYXRoZXJpbmdKb2JzID0gKGpvYnM6IEpvYltdLCByb29tOiBSb29tKSA9PiB7ICAgIC8vIEdhdGhlciBkcm9wcGVkIHJlc291cmNlc1xuICBpZiAocm9vbUNvbnRyb2xsZWRCeU1lKHJvb20pKSB7XG4gICAgZm9yICh2YXIgc291cmNlIG9mIDxTb3VyY2VbXT5yb29tLmZpbmQoRklORF9TT1VSQ0VTKSkge1xuICAgICAgaWYgKGhhc0VuZXJneShzb3VyY2UpICYmIGpvYnNGb3JUYXJnZXQoam9icywgc291cmNlLmlkKS5sZW5ndGggPCAxKSB7XG4gICAgICAgIGFkZEpvYihuZXdNaW5lckpvYihzb3VyY2UpKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2xvYmFscy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiam9icy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidXRpbHMudHNcIiAvPlxuXG5cbnZhciB0cmFuc2ZlckVuZXJneSA9IChmcm9tLHRvKTogbnVtYmVyID0+IHtcbiAgICBpZiAodG8uY29uc3RydWN0b3IgPT0gQ29uc3RydWN0aW9uU2l0ZSkge1xuICAgICAgICByZXR1cm4gZnJvbS5idWlsZCg8Q29uc3RydWN0aW9uU2l0ZT50bylcbiAgICB9XG4gICAgaWYgKHRvLnN0cnVjdHVyZVR5cGUgPT0gJ2NvbnRyb2xsZXInICYmIHRvLm93bmVyICYmIHRvLm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJykge1xuICAgICAgICByZXR1cm4gZnJvbS51cGdyYWRlQ29udHJvbGxlcig8U3RydWN0dXJlPnRvKVxuICAgIH1cbiAgICBpZiAoZnJvbS50cmFuc2ZlckVuZXJneSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZyb20udHJhbnNmZXJFbmVyZ3kodG8pXG4gICAgfSBcbiAgICBpZiAoZnJvbS50cmFuc2ZlciAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZyb20udHJhbnNmZXIodG8sIFJFU09VUkNFX0VORVJHWSlcbiAgICB9XG59XG5cbnZhciBmaW5kTmVhcmVzdEVuZXJneVByb3ZpZGVycyA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogRW5lcmd5SG9sZGVyW10gPT4ge1xuICAgIHZhciBzb3VyY2VzOiBFbmVyZ3lIb2xkZXJbXSA9IG5ldyBBcnJheSgpLmNvbmNhdChcbiAgICAgICAgdGFyZ2V0LnJvb20uZmluZChGSU5EX0RST1BQRURfUkVTT1VSQ0VTKSxcbiAgICAgICAgdGFyZ2V0LnJvb20uZmluZChGSU5EX01ZX1NUUlVDVFVSRVMpLmZpbHRlcigoczogU3RydWN0dXJlKT0+e1xuICAgICAgICAgICAgaWYocy5pZCA9PSB0YXJnZXQuaWQpIHtcbiAgICAgICAgICAgICAgICAvLyBOZXZlciBzZWxlY3QgeW91cnNlbGZcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN3aXRjaChzLnN0cnVjdHVyZVR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9TVE9SQUdFOiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAoPFN0b3JhZ2U+cykuc3RvcmUuZW5lcmd5ID4gMTAwMFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjogXG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucm9vbS5zdG9yYWdlID09IHVuZGVmaW5lZCAmJiAoPFRvd2VyPnMpLmVuZXJneSA+ICg8VG93ZXI+cykuZW5lcmd5Q2FwYWNpdHkgKiAwLjlcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTjogXG4gICAgICAgICAgICAgICAgcmV0dXJuIHMucm9vbS5zdG9yYWdlID09IHVuZGVmaW5lZCAmJiBmYWxzZSAvLyg8U3Bhd24+cykucm9vbS5lbmVyZ3lBdmFpbGFibGUgPCAoPFNwYXduPnMpLmVuZXJneSAqIDJcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9MSU5LOiBcbiAgICAgICAgICAgICAgICByZXR1cm4gKDxMaW5rPnMpLmVuZXJneSA+IDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkpXG4gICAgcmV0dXJuIHNvdXJjZXNcbn1cblxudmFyIGZpbmRCZXN0U291cmNlID0gKGNyZWVwOiBDcmVlcCwgdGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IFBvc2l0aW9uRW50aXR5ID0+IHtcbiAgICB2YXIgYWxsU291cmNlcyA9IGZpbmROZWFyZXN0RW5lcmd5UHJvdmlkZXJzKHRhcmdldClcbiAgICB2YXIgZGlzdGFuY2VDYWNoZSA9IHt9XG4gICAgYWxsU291cmNlcyA9IGFsbFNvdXJjZXMuZmlsdGVyKHM9PntyZXR1cm4gcyAhPSBudWxsfSlcbiAgICBhbGxTb3VyY2VzLnNvcnQoKGE6IFBvc2l0aW9uRW50aXR5LCBiOiBQb3NpdGlvbkVudGl0eSkgPT4ge1xuICAgICAgICBpZiAoZGlzdGFuY2VDYWNoZVthLmlkXSA9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICBkaXN0YW5jZUNhY2hlW2EuaWRdID0gY3JlZXAucG9zLmdldFJhbmdlVG8oYSkgKyB0YXJnZXQucG9zLmdldFJhbmdlVG8oYSlcbiAgICAgICAgaWYgKGRpc3RhbmNlQ2FjaGVbYi5pZF0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgZGlzdGFuY2VDYWNoZVtiLmlkXSA9IGNyZWVwLnBvcy5nZXRSYW5nZVRvKGIpICsgdGFyZ2V0LnBvcy5nZXRSYW5nZVRvKGIpXG4gICAgICAgIHJldHVybiBkaXN0YW5jZUNhY2hlW2EuaWRdIC0gZGlzdGFuY2VDYWNoZVtiLmlkXVxuICAgIH0pXG4gICAgaWYgKGFsbFNvdXJjZXMubGVuZ3RoID4gMClcbiAgICAgICAgcmV0dXJuIGFsbFNvdXJjZXNbMF1cbiAgICByZXR1cm4gbnVsbFxufVxuXG52YXIgUm9sZXM6IHsgW2luZGV4OiBzdHJpbmddOiBKb2JGdW5jIH0gPSB7XG4gICAgbWVnYU1pbmVyOiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICB2YXIgc291cmNlSWQgPSBjcmVlcC5tZW1vcnkuc0lkO1xuICAgICAgICB2YXIgc291cmNlO1xuICAgICAgICBpZiAoc291cmNlSWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSBHYW1lLmdldE9iamVjdEJ5SWQoc291cmNlSWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2IudGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2IudGFyZ2V0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc291cmNlID0gam9iLnRhcmdldC5wb3MuZmluZENsb3Nlc3RCeVJhbmdlKEZJTkRfU09VUkNFUylcbiAgICAgICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubWVtb3J5LnNJZCA9IHNvdXJjZS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc291cmNlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGVyciA9IGNyZWVwLmhhcnZlc3Qoc291cmNlKTtcbiAgICAgICAgICAgIGlmIChlcnIgPT0gRVJSX05PVF9JTl9SQU5HRSkge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLm1vdmVUbyhzb3VyY2UpO1xuICAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPiAwKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAuZHJvcChSRVNPVVJDRV9FTkVSR1kpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9LFxuXG4gICAgcmVwYWlyOiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoIW5lZWRzUmVwYWlyKDxTdHJ1Y3R1cmU+am9iLnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybiBKT0JfQ09NUExFVEVcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5IDwgNTApIHtcbiAgICAgICAgICAgIHZhciBlbmVyZ3lTb3VyY2UgPSBmaW5kQmVzdFNvdXJjZShjcmVlcCwgam9iLnRhcmdldClcbiAgICAgICAgICAgIHZhciBlcnIgPSBFUlJfTk9UX0lOX1JBTkdFXG4gICAgICAgICAgICBpZiAoY3JlZXAucG9zLmlzTmVhclRvKGVuZXJneVNvdXJjZSkpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSB0cmFuc2ZlckVuZXJneShlbmVyZ3lTb3VyY2UsIGNyZWVwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKGVuZXJneVNvdXJjZSwgeyByZXVzZVBhdGg6IDQwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2IudGFyZ2V0KSkge1xuICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi50YXJnZXQsIHsgcmV1c2VQYXRoOiA0MCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnIgPSBjcmVlcC5yZXBhaXIoPFN0cnVjdHVyZT5qb2IudGFyZ2V0KVxuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKGpvYi50YXJnZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPT0gMCB8fCAhbmVlZHNSZXBhaXIoPFN0cnVjdHVyZT5qb2IudGFyZ2V0KSkge1xuICAgICAgICAgICAgcmV0dXJuIEpPQl9DT01QTEVURTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyXG4gICAgfSxcblxuICAgIGZpbGxGcm9tQmVzdFNvdXJjZTogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgdmFyIHNvdXJjZTogUG9zaXRpb25FbnRpdHlcbiAgICAgICAgdmFyIGVycjogbnVtYmVyXG4gICAgICAgIGlmKGNyZWVwLm1lbW9yeVsnc3JjJ10gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSA8U3RydWN0dXJlfEVuZXJneT5HYW1lLmdldE9iamVjdEJ5SWQoY3JlZXAubWVtb3J5WydzcmMnXSlcbiAgICAgICAgfVxuICAgICAgICBpZighZShzb3VyY2UpIHx8ICFoYXNFbmVyZ3koc291cmNlKSkge1xuICAgICAgICAgICAgc291cmNlID0gZmluZEJlc3RTb3VyY2UoY3JlZXAsIGpvYi50YXJnZXQpXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNvdXJjZSA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gRVJSX05PVF9FTk9VR0hfUkVTT1VSQ0VTXG4gICAgICAgIH1cbiAgICAgICAgY3JlZXAubWVtb3J5WydzcmMnXSA9IHNvdXJjZS5pZFxuICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oc291cmNlLCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCg8RW5lcmd5PnNvdXJjZSkuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnBpY2t1cCg8RW5lcmd5PnNvdXJjZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVyciA9ICg8RW5lcmd5SG9sZGVyPnNvdXJjZSkudHJhbnNmZXJFbmVyZ3koY3JlZXApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZihjcmVlcC5jYXJyeS5lbmVyZ3kgPT0gY3JlZXAuY2FycnlDYXBhY2l0eSB8fCAhaGFzRW5lcmd5KHNvdXJjZSkpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjcmVlcC5tZW1vcnlbJ3NyYyddXG4gICAgICAgICAgICByZXR1cm4gSk9CX0NPTVBMRVRFXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9fUEFUSCkge1xuICAgICAgICAgIGVyciA9IHdpZ2dsZShjcmVlcClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyXG4gICAgfSxcblxuICAgIGZpbGxTdHJ1Y3Q6IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgICAgIHZhciBlcnI6IG51bWJlclxuICAgICAgICBpZighbmVlZHNFbmVyZ3koPFN0cnVjdHVyZT5qb2IudGFyZ2V0KSkge1xuICAgICAgICAgICAgY3JlZXAubG9nKFwibm8gZW5lcmd5IG5lZWRlZCBmb3IgXCIgKyBqb2IudGFyZ2V0KVxuICAgICAgICAgICAgcmV0dXJuIEpPQl9DT01QTEVURVxuICAgICAgICB9XG4gICAgICAgIC8vIGZpbGxzIGpvYi50YXJnZXQsIFxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5IDwgNTApIHtcbiAgICAgICAgICAgIC8vIHJlZmlsbFxuICAgICAgICAgICAgZXJyID0gUm9sZXNbXCJmaWxsRnJvbUJlc3RTb3VyY2VcIl0oY3JlZXAsIGpvYilcbiAgICAgICAgICAgIGlmIChlcnIgIT0gSk9CX0NPTVBMRVRFKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVyclxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXJyID0gdHJhbnNmZXJFbmVyZ3koY3JlZXAsIGpvYi50YXJnZXQpXG4gICAgICAgIGlmIChlcnIgPT0gRVJSX05PVF9JTl9SQU5HRSkge1xuICAgICAgICAgIGVyciA9IGNyZWVwLm1vdmVUbyhqb2IudGFyZ2V0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICB9XG4gICAgICAgIC8vIGlmIChlcnIgPT0gRVJSX0lOVkFMSURfVEFSR0VUKSB7XG4gICAgICAgIC8vICAgZXJyID0gd2lnZ2xlKGNyZWVwKVxuICAgICAgICAvLyB9XG4gICAgICAgIGlmKCFuZWVkc0VuZXJneSg8U3RydWN0dXJlPmpvYi50YXJnZXQpKSB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJubyBlbmVyZ3kgbmVlZGVkIGZvciBcIiArIGpvYi50YXJnZXQpXG4gICAgICAgICAgICByZXR1cm4gSk9CX0NPTVBMRVRFXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9fUEFUSCkge1xuICAgICAgICAgIGVyciA9IHdpZ2dsZShjcmVlcClcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyXG4gICAgfVxufVxuXG5cbnZhciBSb2xlc1JldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoUm9sZXMpKSB7XG4gICAgdmFyIGZuOiBhbnkgPSBSb2xlc1tybl1cbiAgICBSb2xlc1JldmVyc2VbZm5dID0gcm5cbn1cblxudmFyIHdpZ2dsZSA9IChjcmVlcDpTY3JlZXApID0+IHtcbiAgcmV0dXJuIGNyZWVwLm1vdmUoTWF0aC5mbG9vcigxICsgTWF0aC5yYW5kb20oKSAqIDcpKVxufSIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdsb2JhbHMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImpvYnMudHNcIiAvPlxuXG5cbnZhciBNQVhfQ1JFRVBTX1BFUl9ST09NID0gMjBcbnZhciBydW5TcGF3biA9IChzcGF3bjogU3Bhd24sIGpvYnM6IEpvYltdKSA9PiB7XG4gIHZhciBuZWVkZWRDcmVlcHMgPSBnZXROZWVkZWRDcmVlcHMoam9icy5maWx0ZXIodGFyZ2V0SW5TYW1lT3JOZXdSb29tKHNwYXduLnBvcy5yb29tTmFtZSkpKVxuICB2YXIgY3JlZXBzSW5Sb29tID0gc3Bhd24ucm9vbS5maW5kKEZJTkRfTVlfQ1JFRVBTKS5sZW5ndGhcbiAgaWYobmVlZGVkQ3JlZXBzLmxlbmd0aCA9PSAwIHx8IGNyZWVwc0luUm9vbSA+IE1BWF9DUkVFUFNfUEVSX1JPT00gfHwgY3JlZXBzSW5Sb29tID4gNCAmJiBzcGF3bi5yb29tLmVuZXJneUF2YWlsYWJsZSA8IHNwYXduLnJvb20uZW5lcmd5Q2FwYWNpdHlBdmFpbGFibGUpIHtcbiAgICByZXR1cm5cbiAgfVxuICBzcGF3bkNyZWVwcyhzcGF3biwgbmVlZGVkQ3JlZXBzKVxufVxuXG52YXIgZ2V0TmVlZGVkQ3JlZXBzID0gKGpvYnM6IEpvYltdKTogQm9keVBhcnRbXVtdID0+IHtcbiAgICB2YXIgbmVlZGVkQ3JlZXBzOiBCb2R5UGFydFtdW10gPSBbXSAvL1tbV09SSyxDQVJSWSxNT1ZFXV0gLy8sW0NBUlJZLENBUlJZLE1PVkVdLCBbQ0FSUlksQ0FSUlksTU9WRV0sIFtXT1JLLFdPUkssTU9WRV1dO1xuICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgIGlmIChqb2IuY3JlZXAgPT0gdW5kZWZpbmVkKSB7IC8vIGhhY2t5IC0tIGFkZCAxIGJvZHkgcmVxIHBlciBwcmlvcml0eVxuICAgICAgICAgICAgZm9yKHZhciBpPTA7aTxqb2IucHJpb3JpdHk7aSsrKSB7XG4gICAgICAgICAgICAgICAgbmVlZGVkQ3JlZXBzLnB1c2goam9iLmJvZHlSZXEpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5lZWRlZENyZWVwc1xufVxuLy8gICAgIC8vIFRPT0QgLS0gZG8gdGhpcyBwZXItcm9vbVxuLy8gICAgIGNvbnN0IE1BWF9DUkVFUFMgPSAyMFxuLy8gICAgIGlmKG5lZWRlZENyZWVwcy5sZW5ndGggPiAwICYmIGNyZWVwcy5sZW5ndGggPCBNQVhfQ1JFRVBTKSB7XG4vLyAgICAgICAgIHNwYXduQ3JlZXBzKG5lZWRlZENyZWVwcykgICAgICAgIFxuLy8gICAgIH1cbi8vIH1cblxudmFyIGdldEJvZHlDb3N0ID0gKGJvZHk6IEJvZHlQYXJ0W10pOiBudW1iZXIgPT4ge1xuICAgIHZhciBjb3N0ID0gMFxuICAgIGZvciAodmFyIHBhcnQgb2YgYm9keSkge1xuICAgICAgICBjb3N0ICs9IEJPRFlQQVJUX0NPU1RbcGFydF1cbiAgICB9XG4gICAgcmV0dXJuIGNvc3Rcbn1cblxudmFyIGdldEJvZHlEZWZpbml0aW9uID0gKGJvZHk6IEJvZHlQYXJ0W10sIGVuZXJneUNhcGFjaXR5OiBudW1iZXIpOiBCb2R5UGFydFtdID0+IHtcbiAgICB2YXIgYm9keVBhcnRzID0gW11cbiAgICB2YXIgY29zdCA9IGdldEJvZHlDb3N0KGJvZHkpXG4gICAgdmFyIGJvZHlDb3VudHMgPSBNYXRoLm1pbihNYXRoLmZsb29yKGVuZXJneUNhcGFjaXR5IC8gY29zdCksIE1hdGguZmxvb3IoNTAgLyBib2R5Lmxlbmd0aCkpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2R5Q291bnRzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYm9keVBhcnRzLCBib2R5KVxuICAgIH1cbiAgICByZXR1cm4gYm9keVBhcnRzXG59XG5cblxuLy8gVE9ETzogU29tZSBzb3J0IG9mIGxpbWl0cyBvbiBjcmVlcHMsIG1heWJlIHJlZHVjZSBjaGFuY2Ugb2Ygc3Bhd25pbmcgZHVwbGljYXRlIGJvZGllcz9cbnZhciBzcGF3bkNyZWVwcyA9IChzcGF3bjogU3Bhd24sIGJvZHlQYXJ0czogQm9keVBhcnRbXVtdKSA9PiB7XG4gICAgaWYgKGJvZHlQYXJ0cy5sZW5ndGggPT0gMCkgcmV0dXJuO1xuICAgIGlmIChzcGF3bi5zcGF3bmluZyAhPSBudWxsKSByZXR1cm47XG4gICAgdmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGJvZHlQYXJ0cy5sZW5ndGgpXG4gICAgdmFyIGJvZHkgPSBib2R5UGFydHNbaWR4XVxuICAgIHZhciBib2QgPSBnZXRCb2R5RGVmaW5pdGlvbihib2R5LCBzcGF3bi5yb29tLmVuZXJneUF2YWlsYWJsZSlcbiAgICBpZiAoYm9kLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhcIldhbnQgdG8gc3Bhd24gXCIsIGJvZClcbiAgICB2YXIgZXJyID0gc3Bhd24uY3JlYXRlQ3JlZXAoYm9kKVxuICAgIGlmIChlcnIgPT0gMCkge1xuICAgICAgICBib2R5UGFydHMuc3BsaWNlKGlkeClcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgfVxufVxuIiwiY29uc3QgVEFSR0VUX1NDT1JFX0hFQUwgPSA1XG5jb25zdCBUQVJHRVRfU0NPUkVfQVRUQUNLID0gMFxuY29uc3QgVEFSR0VUX1NDT1JFX1NIT09UID0gM1xuXG52YXIgc2NvcmVUYXJnZXQgPSAoc3JjOiBTY3JlZXAgfCBUb3dlciwgdGFyZ2V0OiBTY3JlZXApID0+IHtcbiAgICB2YXIgc2NvcmUgPSBzcmMucG9zLmdldFJhbmdlVG8odGFyZ2V0KVxuICAgIHNjb3JlICs9IHRhcmdldC5ob3dNYW55UGFydHMoSEVBTCkgKiBUQVJHRVRfU0NPUkVfSEVBTFxuICAgIHNjb3JlICs9IHRhcmdldC5ob3dNYW55UGFydHMoQVRUQUNLKSAqIFRBUkdFVF9TQ09SRV9BVFRBQ0tcbiAgICBzY29yZSArPSB0YXJnZXQuaG93TWFueVBhcnRzKFJBTkdFRF9BVFRBQ0spICogVEFSR0VUX1NDT1JFX1NIT09UXG4gICAgcmV0dXJuIHNjb3JlXG59XG5cbnZhciB0YXJnZXRBdHRhY3RpdmVuZXNzQ21wID0gKHRvd2VyOlRvd2VyfFNjcmVlcCkgID0+IHtcbiAgICByZXR1cm4gKGE6U2NyZWVwLGI6U2NyZWVwKTpudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gc2NvcmVUYXJnZXQodG93ZXIsIGEpIC0gc2NvcmVUYXJnZXQodG93ZXIsYilcbiAgICB9XG59XG5cbnZhciBydW5Ub3dlciA9ICh0b3dlcikgPT4ge1xuICAgIC8vIEZpbmQgc3RydWN0dXJlcywgc29ydCBieSBwcmlvcml0eT9cbiAgICAvLyBFdmVudHVhbGx5IHRvd2VyIGNhbiBjb25zdW1lIGpvYnM6PyBvciBhbHdheXMgc2VwYXJhdGVcbiAgICAvLyBUT0RPOiBidWlsZGluZ3Mvcm9hZHMvcmFtcGFydHMvd2FsbHNcbiAgICB2YXIgZW5lbWllcyA9IHRvd2VyLnJvb20uZmluZChGSU5EX0hPU1RJTEVfQ1JFRVBTKVxuICAgIGlmIChlbmVtaWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZW5lbWllcy5zb3J0KHRhcmdldEF0dGFjdGl2ZW5lc3NDbXAodG93ZXIpKVxuICAgICAgICB0b3dlci5hdHRhY2soZW5lbWllc1swXSlcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIHN0cnVjdHVyZXMgPSB0b3dlci5yb29tLmZpbmQoRklORF9TVFJVQ1RVUkVTKVxuICAgIHN0cnVjdHVyZXMuc29ydCgoYSwgYikgPT4geyByZXR1cm4gYS5oaXRzIC0gYi5oaXRzIH0pXG4gICAgZm9yICh2YXIgcyBvZiBzdHJ1Y3R1cmVzKSB7XG4gICAgICAgIGlmIChuZWVkc1JlcGFpcihzKSkge1xuICAgICAgICAgICAgdG93ZXIucmVwYWlyKHMpXG4gICAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgfVxufVxuIiwiLy8gYWRkIGpvYiBhZ2VcblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2xvYmFscy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiam9icy50c1wiIC8+XG5cblxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cInV0aWxzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJyb2xlcy50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiYXNzaWduX2pvYnMudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImNyZWF0ZV9qb2JzLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzcGF3bi50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwidG93ZXIudHNcIiAvPlxuXG5cbnR5cGUgSm9iRnVuYyA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4gbnVtYmVyO1xudHlwZSBDcmVlcEZpbHRlciA9IChjcmVlcDogU2NyZWVwKSA9PiBib29sZWFuO1xudHlwZSBKb2JGaWx0ZXIgPSAoam9iOkpvYikgPT4gYm9vbGVhbjtcbnR5cGUgQ3JlZXBDbXAgPSAoYTogQ3JlZXAsIGI6IFNjcmVlcCkgPT4gbnVtYmVyO1xuXG52YXIgY3B1T3ZlckJ1ZGdldCA9ICgpID0+XG4oKEdhbWUuY3B1LmJ1Y2tldCA8IDUwMDAgJiYgR2FtZS5jcHUuZ2V0VXNlZCgpID4gMTAwKSB8fFxuICAgIChHYW1lLmNwdS5idWNrZXQgPCAyMDAwICYmIEdhbWUuY3B1LmdldFVzZWQoKSA+IDMwKSAgfHxcbiAgICAoR2FtZS5jcHUuYnVja2V0IDwgMTAwMCAmJiBHYW1lLmNwdS5nZXRVc2VkKCkgPiAxMCkgIHx8XG4gICAgR2FtZS5jcHUuYnVja2V0IDwgMTAwKVxuXG5cbmludGVyZmFjZSBFbmVyZ3lIb2xkZXIgZXh0ZW5kcyBTdHJ1Y3R1cmUge1xuICAgIGVuZXJneTogbnVtYmVyO1xuICAgIGVuZXJneUNhcGFjaXR5OiBudW1iZXI7XG4gICAgdHJhbnNmZXJFbmVyZ3koYzogQ3JlZXApXG59XG5cbi8vIFRPRE86IGZpZ3VyZSBvdXQgYmV0dGVyIGlkbGUgc2l0dWF0aW9uXG4vLyBUT0RPOiByb2FkIGNyZWF0b3IgLS0ga2VlcCBtYXAgb2Ygcm9hZCBwb3NpdGlvbnMsIHBhdmUgbW9zdCB0cmF2ZWxlZCB1bnBhdmVkIGFyZWFcbi8vIFRPRE8gOiBtYXhpbWl6ZSB1cGdyYWRpbmchXG5cblxudmFyIHJ1blN0cnVjdHVyZXMgPSAoam9iczpKb2JbXSkgPT4ge1xuICAgIGZvcih2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgdmFyIHJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXVxuICAgICAgICBmb3IgKHZhciBzdHJ1Y3Qgb2Ygcm9vbS5maW5kKEZJTkRfTVlfU1RSVUNUVVJFUykpe1xuICAgICAgICAgICAgc3dpdGNoKHN0cnVjdC5zdHJ1Y3R1cmVUeXBlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBTVFJVQ1RVUkVfVE9XRVI6XG4gICAgICAgICAgICAgICAgcnVuVG93ZXIoc3RydWN0KVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgY2FzZSBTVFJVQ1RVUkVfU1BBV046XG4gICAgICAgICAgICAgICAgcnVuU3Bhd24oc3RydWN0LCBqb2JzKVxuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gICAgXG4gICAgfVxufVxuXG4vLyBEZWZlbmQsIGF0dGFjaywgZXRjLlxuLy8gQXNzaWduIGpvYnMgdG8gY3JlZXBzXG5cbnZhciBtZW1Kb2JzOiBKb2JbXSA9IGxvYWRKb2JzKCk7XG52YXIgYWRkSm9iID0gKGpvYjogSm9iKSA9PiB7XG4gICAgaWYobWVtSm9icy5sZW5ndGggPiBNQVhfSk9CUyAmJiBqb2IucHJpb3JpdHkgIT0gUHJpb3JpdHkuSElHSCkge1xuICAgICAgICByZXR1cm4gLy8gc2tpcHAgXG4gICAgfVxuICAgIG1lbUpvYnMucHVzaChqb2IpXG59XG5cbnZhciByZW1vdmVKb2IgPSAoam9iOiBKb2IpID0+IHtcbiAgICB2YXIgaWR4ID0gbWVtSm9icy5pbmRleE9mKGpvYilcbiAgICBpZiAoaWR4IDwgMCkgcmV0dXJuXG4gICAgICAgIG1lbUpvYnMuc3BsaWNlKGlkeCwgMSlcbn1cblxuaWYgKCFlKG1lbUpvYnMpKSB7XG4gICAgbWVtSm9icyA9IFtdXG59XG52YXIgcHJlSm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcbmNvbnNvbGUubG9nKHByZUpvYlRzKVxucnVuU3RydWN0dXJlcyhtZW1Kb2JzKVxuZG9Kb2JzKG1lbUpvYnMpXG5jcmVhdGVKb2JzKG1lbUpvYnMpXG4vL3NwYXduTmV3Q3JlZXBzKG1lbUpvYnMpXG5zYXZlSm9icyhtZW1Kb2JzKVxudmFyIHBvc3RKb2JUcyA9IEdhbWUuY3B1LmdldFVzZWQoKVxuY29uc29sZS5sb2cocG9zdEpvYlRzIC0gcHJlSm9iVHMpXG5cbkdhbWUuUm9sZXMgPSBSb2xlc1xuXG52YXIgY2xrID0gR2FtZS5mbGFnc1snQ2xvY2snXVxuaWYgKGUoY2xrKSkgY2xrLnNldENvbG9yKGNsay5jb2xvciA9PSBDT0xPUl9XSElURSA/IENPTE9SX0dSRVkgOiBDT0xPUl9XSElURSlcblxuXG5HYW1lLmxpc3RKb2JzID0gKCkgPT4ge1xuICAgIGZvciAodmFyIGpvYiBvZiBtZW1Kb2JzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGpvYi5uYW1lLCBqb2IuY3JlZXAubmFtZSwgam9iLnRhcmdldClcbiAgICB9XG59Il19