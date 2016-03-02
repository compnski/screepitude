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
        this.start = opts['start'];
        this.end = opts['end'];
        this.jobFunc = opts['jobFunc'];
        this.bodyReq = opts['bodyReq'];
        this.candidateCmp = opts['candidateCmp'];
        if (this.bodyReq == undefined) {
            console.log("Bad job!!, no body " + this.name);
            console.log(opts['bodyReq']);
            throw new Error("Bad job=" + this.name);
        }
    }
    Job.prototype.toJSON = function () {
        var jobFn = this.jobFunc;
        var filterFn = this.candidateFilter;
        var cmpFn = this.candidateCmp;
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
        return ret;
    };
    return Job;
})();
var parseJob = function (k, v) {
    switch (k) {
        case 'start':
        case 'end':
            var r = Game.getObjectById(v);
            if (r == undefined) {
                console.log("FAILED TO LOAD " + k + " from " + v);
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
    delete Memory['job_workers'][job.name];
    delete job.creep;
    delete creep.job;
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
    switch (s.structureType) {
        case STRUCTURE_STORAGE:
            return s.store.energy < s.storeCapacity;
        case STRUCTURE_TOWER:
            return s.energy < s.energyCapacity * .75;
        case STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN:
            return s.energy < s.energyCapacity;
    }
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
var findNearestStorage = function (target) {
    var stores = getMyStructuresInRoom(target.pos.roomName, [STRUCTURE_STORAGE]).filter(needsEnergy);
    if (stores.length == 0)
        stores = getMyStructuresInRoom(target.pos.roomName, [STRUCTURE_TOWER]).filter(needsEnergy);
    if (stores.length == 0)
        stores = getMyStructuresInAllRooms([STRUCTURE_STORAGE]).filter(needsEnergy);
    if (stores.length == 0)
        stores = getMyStructuresInAllRooms([STRUCTURE_SPAWN]).filter(needsEnergy);
    return target.pos.findClosestByRange(stores);
};
var createPickupJob = function (target) {
    return new Job({
        namePrefix: 'carry',
        start: target,
        end: findNearestStorage(target),
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createFillJob = function (target) {
    return new Job({
        namePrefix: 'fill',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createDeliverJob = function (target) {
    return new Job({
        namePrefix: 'deliver',
        start: findNearestStorage(target),
        jobFunc: Roles['deliver'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['noop'],
    });
};
var createBuildJob = function (target) {
    return new Job({
        namePrefix: 'upgrade',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, WORK, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createUpgradeJob = function (target) {
    return new Job({
        namePrefix: 'upgrade',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, MOVE, MOVE, WORK, WORK, WORK, WORK, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var runAllJobs = function (staticJobs, memJobs) {
    var addJob = function (job) {
        memJobs.push(job);
    };
    var removeJob = function (job) {
        var idx = memJobs.indexOf(job);
        if (idx < 0)
            return;
        memJobs.splice(idx, 1);
        idx = jobs.indexOf(job);
        jobs.splice(idx, 1);
    };
    var jobs = staticJobs.concat(memJobs);
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
    var seenJobs = {};
    for (var _b = 0; _b < jobs.length; _b++) {
        var job = jobs[_b];
        if (seenJobs[job.name]) {
            console.log("DUPLICATE JOB IN LIST!! " + job.name);
        }
        seenJobs[job.name] = true;
        var creepName = Memory['job_workers'][job.name];
        var creep = undefined;
        console.log(job.name, creepName, job.start);
        if (creepName != undefined) {
            creep = Game.creeps[creepName];
            if (job.start == undefined || job.start == null) {
                console.log("Start disappeared for " + job.name);
                removeJob(job);
                if (creep != undefined) {
                    clearJob(creep, job);
                }
                continue;
            }
        }
        else {
            if (job.start == undefined || job.start == null) {
                console.log("Start disappeared for " + job.name);
                removeJob(job);
                continue;
            }
        }
        if (creep == undefined) {
            delete Memory['job_workers'][job.name];
        }
        else {
            console.log("setting " + creep.name + " to do " + job.name);
            setJob(creep, job);
        }
    }
    var GATHER_THRESHOLD = 200;
    for (var _c = 0, _d = Object.keys(Game.rooms); _c < _d.length; _c++) {
        var roomName = _d[_c];
        var room = Game.rooms[roomName];
        var resources = room.find(FIND_DROPPED_RESOURCES);
        var resourcesById = {};
        for (var _e = 0; _e < jobs.length; _e++) {
            var job = jobs[_e];
            if (job.start == null)
                continue;
            if (job.start.resourceType == RESOURCE_ENERGY) {
                if (resourcesById[job.start.id] == undefined) {
                    resourcesById[job.start.id] = 0;
                }
                console.log(job.name, job.creep);
                if (job.creep != undefined) {
                    resourcesById[job.start.id] += (job.creep.carryCapacity - job.creep.carry.energy);
                }
                else {
                    resourcesById[job.start.id] += 999;
                }
            }
        }
        console.log(JSON.stringify(resourcesById));
        for (var _f = 0; _f < resources.length; _f++) {
            var resource = resources[_f];
            var currentlyAllocatedCapacity = resourcesById[resource.id] || 0;
            if ((resource.amount - currentlyAllocatedCapacity) > GATHER_THRESHOLD) {
                console.log("New pickup job");
                addJob(createPickupJob(resource));
            }
        }
    }
    var needsRepair = function (s) {
        if (s.structureType == STRUCTURE_WALL) {
            return s.hits < Math.min(s.hitsMax, 50000);
        }
        if (s.structureType == STRUCTURE_RAMPART) {
            return s.hits < Math.min(s.hitsMax, 10000);
        }
        return s.hits < s.hitsMax;
    };
    var runTower = function (tower) {
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
    var STRUCTURES_TO_INVESTIGATE = [STRUCTURE_TOWER, STRUCTURE_CONTROLLER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION];
    var structures = {};
    for (var _g = 0, _h = Object.keys(Game.rooms); _g < _h.length; _g++) {
        var roomName = _h[_g];
        var room = Game.rooms[roomName];
        var roomStructures = room.find(FIND_STRUCTURES);
        for (var _j = 0; _j < STRUCTURES_TO_INVESTIGATE.length; _j++) {
            var structType = STRUCTURES_TO_INVESTIGATE[_j];
            structures[structType] = (structures[structType] || []).concat(roomStructures.filter(function (s) { return s.structureType == structType; }));
        }
    }
    for (var _k = 0; _k < STRUCTURES_TO_INVESTIGATE.length; _k++) {
        var structType = STRUCTURES_TO_INVESTIGATE[_k];
        for (var _l = 0, _m = structures[structType]; _l < _m.length; _l++) {
            var struct = _m[_l];
            if (struct.owner && struct.owner.username != 'omgbear')
                continue;
            var jobsForStruct = [];
            for (var _o = 0; _o < jobs.length; _o++) {
                var job = jobs[_o];
                if (job.start && job.start.id == struct.id || (job.end && job.end.id == struct.id)) {
                    jobsForStruct.push(job);
                }
            }
            switch (structType) {
                case STRUCTURE_TOWER:
                    runTower(struct);
                case STRUCTURE_SPAWN:
                case STRUCTURE_EXTENSION:
                    if (struct.energy < struct.energyCapacity) {
                        if (jobsForStruct.length == 0) {
                            addJob(createFillJob(struct));
                        }
                    }
                    break;
                case STRUCTURE_CONTROLLER:
                    if (struct.level < 5) {
                        if (jobsForStruct.length <= 3) {
                            addJob(createUpgradeJob(struct));
                        }
                    }
                    else {
                        if (jobsForStruct.length <= 2) {
                            addJob(createUpgradeJob(struct));
                        }
                    }
                    break;
            }
        }
    }
    var roomSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    for (var _p = 0; _p < roomSites.length; _p++) {
        var site = roomSites[_p];
        var jobsForSite = [];
        for (var _q = 0; _q < jobs.length; _q++) {
            var job = jobs[_q];
            if (job.start && job.start.id == struct.id || (job.end && job.end.id == struct.id)) {
                jobsForSite.push(job);
            }
        }
        addJob(createBuildJob(site));
    }
    var noJob = function (c) {
        return c.job == undefined || c.job == null;
    };
    var getCandidateFilter = function (bodyReq) {
        var br = bodyReq.slice(0);
        return function (creep) {
            for (var _i = 0; _i < br.length; _i++) {
                var neededPart = br[_i];
                var found = false;
                for (var _a = 0, _b = creep.body; _a < _b.length; _a++) {
                    var bodyPart = _b[_a];
                    if (bodyPart.type == neededPart) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    return false;
            }
            console.log("ok to assign " + JSON.stringify(creep.body) + " to " + bodyReq);
            return true;
        };
    };
    var findSuitableCreep = function (job) {
        var candidates = creeps.filter(noJob).filter(getCandidateFilter(job.bodyReq)).sort(job.candidateCmp);
        if (candidates.length > 0) {
            return candidates[0];
        }
        else {
            return null;
        }
    };
    var neededCreeps = [];
    for (var _r = 0; _r < jobs.length; _r++) {
        var job = jobs[_r];
        if (job.creep != undefined) {
            continue;
        }
        console.log("Need to replace creep for job " + job.name);
        var creep = findSuitableCreep(job);
        if (creep != null) {
            console.log("Picked creep for job " + job.name + " got " + creep.name);
            setJob(creep, job);
        }
        else {
            console.log("no candidates for job=" + job.name + "  " + job.bodyReq);
            neededCreeps.push(job.bodyReq);
        }
    }
    var runJob = function (creep, job) {
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
                creep.log("Job complete!");
                removeJob(creep.job);
                clearJob(creep, creep.job);
                break;
            case E_CRASH:
            case ERR_NOT_FOUND:
            case ERR_INVALID_TARGET:
            case ERR_FULL:
            case ERR_INVALID_ARGS:
            case ERR_NOT_OWNER:
                creep.log("Job Failed!! err=" + ret);
                removeJob(creep.job);
                clearJob(creep, creep.job);
        }
        return ret;
    };
    job = null;
    for (var _s = 0; _s < creeps.length; _s++) {
        var creep = creeps[_s];
        if (creep.spawning)
            continue;
        if (creep.job != undefined) {
            creep.log("job=" + creep.job.name);
            if (creep.job.start == undefined) {
                removeJob(creep.job);
                clearJob(creep, creep.job);
                continue;
            }
            runJob(creep, job);
        }
        else {
            creep.log("Nothing to do");
            if (Game.flags['Idle'] != undefined) {
                creep.moveTo(Game.flags['Idle']);
            }
        }
    }
    spawnCreeps(neededCreeps);
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
    console.log("Body costs " + cost);
    var bodyCounts = Math.min(Math.floor(energyCapacity / cost), Math.floor(50 / body.length));
    console.log("Going to build x" + bodyCounts);
    for (var i = 0; i < bodyCounts; i++) {
        Array.prototype.push.apply(bodyParts, body);
    }
    return bodyParts;
};
var spawnCreeps = function (bodyParts) {
    if (bodyParts.length == 0)
        return;
    for (var _i = 0, _a = Object.keys(Game.spawns); _i < _a.length; _i++) {
        var spawnName = _a[_i];
        var spawn = Game.spawns[spawnName];
        if (spawn.spawning != null)
            continue;
        var idx = Math.floor(Math.random() * bodyParts.length);
        var body = bodyParts[idx];
        var bod = getBodyDefinition(body, spawn.room.energyAvailable);
        console.log("Want to spawn ", bod);
        var err = spawn.createCreep(bod);
        if (err == 0) {
            bodyParts.splice(idx);
        }
        else {
            console.log(err);
        }
    }
};
var hasEnergy = function (s) {
    if (s.amount != undefined) {
        return s.amount > 0;
    }
    if (s.store != undefined) {
        return s.store.energy > 0;
    }
    if (s.carry != undefined) {
        return s.carry.energy > 0;
    }
    if (s.energy != undefined) {
        return s.energy > 0;
    }
    return false;
};
var Roles = {
    megaMiner: function (creep, job) {
        var sourceId = creep.memory.sId;
        var source;
        if (sourceId != undefined) {
            source = Game.getObjectById(sourceId);
        }
        if (source == undefined) {
            if (!creep.pos.isNearTo(job.start)) {
                creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 });
            }
            creep.log(job.start);
            source = job.start.pos.findClosestByRange(FIND_SOURCES);
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
    deliver: function (creep, job) {
        if (!creep.pos.isNearTo(job.start)) {
            creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 });
        }
        else {
            var err;
            var start = job.start;
            if ((start).structureType == 'controller' && start.owner && start.owner.username == 'omgbear') {
                err = creep.upgradeController(job.start);
            }
            else if (start.constructor == ConstructionSite) {
                err = creep.build(job.start);
            }
            else {
                err = creep.transferEnergy(job.start);
            }
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.start);
            }
        }
        if (creep.carry.energy == 0) {
            return JOB_COMPLETE;
        }
        return err;
    },
    carry: function (creep, job) {
        if (job.start != undefined && creep.carry.energy < creep.carryCapacity && hasEnergy(job.start)) {
            if (!creep.pos.isNearTo(job.start)) {
                creep.moveTo(job.start, { reusePath: 20, maxOps: 1000 });
            }
            else {
                var err;
                if (job.start.amount != undefined) {
                    err = creep.pickup(job.start);
                }
                else {
                    err = job.start.transferEnergy(creep);
                }
                if (err == ERR_NOT_IN_RANGE) {
                    err = creep.moveTo(job.start);
                }
            }
        }
        if (creep.carry.energy > 0) {
            job.jobFunc = Roles['deliver'];
            job.start = job.end;
            if (job.end == undefined) {
                job.end = findNearestStorage(creep);
            }
            delete job.end;
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
var Cmp = {
    worksHard: function (a, b) {
        return b.howManyParts(WORK) - a.howManyParts(WORK);
    },
    carriesTheMost: function (a, b) {
        return (a.carryCapacity - a.carry.energy) - (b.carryCapacity - b.carry.energy);
    },
    noop: function (a, b) {
        return 0;
    }
};
var CmpReverse = {};
for (var _b = 0, _c = Object.keys(Cmp); _b < _c.length; _b++) {
    var rn = _c[_b];
    var fn = Cmp[rn];
    CmpReverse[fn] = rn;
}
;
var staticJobs = [new Job({
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
    })];
var memJobs = [];
try {
    var jobsJSON = Memory["jobs"];
    if (jobsJSON != undefined) {
        memJobs = JSON.parse(jobsJSON, parseJob);
    }
}
catch (ex) {
    console.log("Error parsing in memory jobs!: " + ex + "\n  " + Memory["jobs"]);
    console.log(ex.stack);
}
var preJobTs = Game.cpu.getUsed();
runAllJobs(staticJobs, memJobs);
var postJobTs = Game.cpu.getUsed();
var toRm = [];
for (var _d = 0; _d < memJobs.length; _d++) {
    var job = memJobs[_d];
    if (job.start == undefined) {
        toRm.push(job);
    }
}
for (var _e = 0; _e < toRm.length; _e++) {
    var job = toRm[_e];
    var idx = memJobs.indexOf(job);
    memJobs.splice(idx, 1);
}
Memory["jobs"] = JSON.stringify(memJobs);
Game.Roles = Roles;
var clk = Game.flags['Clock'];
if (clk != undefined) {
    if (clk.color != COLOR_WHITE) {
        clk.setColor(COLOR_WHITE);
    }
    else {
        clk.setColor(COLOR_GREY);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9tYWluLnRzIl0sIm5hbWVzIjpbIlN1cGVyQ3JlZXAiLCJTdXBlckNyZWVwLmNvbnN0cnVjdG9yIiwiU3VwZXJDcmVlcC5ob3dNYW55UGFydHMiLCJTdXBlckNyZWVwLmhhc1BhcnQiLCJTdXBlckNyZWVwLmNhbk1vdmUiLCJTdXBlckNyZWVwLmNhbldvcmsiLCJTdXBlckNyZWVwLmNhbkhlYWwiLCJTdXBlckNyZWVwLmNhbkF0dGFjayIsIlN1cGVyQ3JlZXAuY2FuU2hvb3QiLCJTdXBlckNyZWVwLmNhbkNsYWltIiwiU3VwZXJDcmVlcC5sb2ciLCJhcHBseU1peGlucyIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQU9BO0lBQUFBO0lBaURBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtJQUNwQ0EsQ0FBQ0E7SUFFREgsNEJBQU9BLEdBQVBBO1FBQ0lJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVESiw0QkFBT0EsR0FBUEE7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QSxDQUFDQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFBQTtRQUMxQkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQUE7UUFDdEJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUFBO1FBQzlCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFBQTtRQUM5QkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQUE7UUFDeENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLElBQUlBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO1lBQzVCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUFBO1lBQzlDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFBQTtZQUM1QkEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsVUFBVUEsR0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQUE7UUFDekNBLENBQUNBO0lBQ0xBLENBQUNBO0lBRURELG9CQUFNQSxHQUFOQTtRQUNJRSxJQUFJQSxLQUFLQSxHQUFRQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUM5QkEsSUFBSUEsUUFBUUEsR0FBUUEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0E7UUFDekNBLElBQUlBLEtBQUtBLEdBQVFBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBO1FBQ25DQSxJQUFJQSxHQUFHQSxHQUFHQTtZQUNOQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQTtZQUNmQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxFQUFFQTtZQUNwQkEsT0FBT0EsRUFBRUEsWUFBWUEsQ0FBQ0EsS0FBS0EsQ0FBQ0E7WUFDNUJBLFlBQVlBLEVBQUVBLFVBQVVBLENBQUNBLEtBQUtBLENBQUNBO1lBQy9CQSxPQUFPQSxFQUFFQSxJQUFJQSxDQUFDQSxPQUFPQTtTQUN4QkEsQ0FBQ0E7UUFDRkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsR0FBR0EsSUFBSUEsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDeEJBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLEVBQUVBLENBQUNBO1FBQzdCQSxDQUFDQTtRQUNEQSxNQUFNQSxDQUFDQSxHQUFHQSxDQUFBQTtJQUNkQSxDQUFDQTtJQUNMRixVQUFDQTtBQUFEQSxDQUFDQSxBQW5ERCxJQW1EQztBQUVELElBQUksUUFBUSxHQUFHLFVBQUMsQ0FBUyxFQUFFLENBQUM7SUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNSLEtBQUssT0FBTyxDQUFDO1FBQ2IsS0FBSyxLQUFLO1lBQ04sSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3QixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDakIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3JELENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1QsS0FBSyxDQUFDO1FBQ1YsS0FBSyxTQUFTO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQixLQUFLLENBQUM7UUFDVixLQUFLLGNBQWM7WUFDZixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2QsS0FBSyxDQUFDO1FBQ1YsS0FBSyxFQUFFO1lBQ0gsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDLElBQUssTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDL0MsQ0FBQztJQUNELE1BQU0sQ0FBQyxDQUFDLENBQUE7QUFDWixDQUFDLENBQUE7QUFFRCxJQUFJLE1BQU0sR0FBRyxVQUFDLEtBQWEsRUFBRSxHQUFRO0lBQ2pDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUM3QyxHQUFHLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNsQixLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztBQUNwQixDQUFDLENBQUE7QUFFRCxJQUFJLFFBQVEsR0FBRyxVQUFDLEtBQWEsRUFBRSxHQUFRO0lBQ25DLE9BQU8sTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUE7SUFDaEIsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFBO0FBQ3BCLENBQUMsQ0FBQTtBQUVELElBQUkseUJBQXlCLEdBQUcsVUFBQyxXQUFxQjtJQUNsRCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUE7SUFDaEIsR0FBRyxDQUFDLENBQWlCLFVBQXVCLEVBQXZCLEtBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQXZDLGNBQVksRUFBWixJQUF1QyxDQUFDO1FBQXhDLElBQUksUUFBUSxTQUFBO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUE7S0FDbkU7SUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDO0FBQ25CLENBQUMsQ0FBQTtBQUVELElBQUksV0FBVyxHQUFHLFVBQUMsQ0FBWTtJQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztRQUN0QixLQUFLLGlCQUFpQjtZQUNsQixNQUFNLENBQVcsQ0FBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQWEsQ0FBRSxDQUFDLGFBQWEsQ0FBQztRQUNsRSxLQUFLLGVBQWU7WUFDaEIsTUFBTSxDQUFTLENBQUUsQ0FBQyxNQUFNLEdBQVcsQ0FBRSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUE7UUFDOUQsS0FBSyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLHFCQUFxQjtZQUM1RSxNQUFNLENBQWdCLENBQUUsQ0FBQyxNQUFNLEdBQWtCLENBQUUsQ0FBQyxjQUFjLENBQUE7SUFDMUUsQ0FBQztJQUNELE1BQU0sQ0FBQyxLQUFLLENBQUE7QUFDaEIsQ0FBQyxDQUFBO0FBRUQsSUFBSSxxQkFBcUIsR0FBRyxVQUFDLFFBQWdCLEVBQUUsV0FBcUI7SUFDaEUsSUFBSSxJQUFJLEdBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNyQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztRQUVwQixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sQ0FBQyxFQUFFLENBQUE7SUFDYixDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDLElBQUssTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUE7QUFDakcsQ0FBQyxDQUFBO0FBRUQsSUFBSSxrQkFBa0IsR0FBRyxVQUFDLE1BQXNCO0lBQzVDLElBQUksTUFBTSxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUNoRyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUNuQixNQUFNLEdBQUcscUJBQXFCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM5RixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztRQUNuQixNQUFNLEdBQUcseUJBQXlCLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQy9FLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQ25CLE1BQU0sR0FBRyx5QkFBeUIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzdFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQ2hELENBQUMsQ0FBQTtBQUVELElBQUksZUFBZSxHQUFHLFVBQUMsTUFBc0I7SUFDekMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDO1FBQ1gsVUFBVSxFQUFFLE9BQU87UUFDbkIsS0FBSyxFQUFFLE1BQU07UUFDYixHQUFHLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1FBQy9CLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDO1FBQ3ZCLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO1FBQzdCLFlBQVksRUFBRSxHQUFHLENBQUMsZ0JBQWdCLENBQUM7S0FDdEMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUFBO0FBRUQsSUFBSSxhQUFhLEdBQUcsVUFBQyxNQUFzQjtJQUN2QyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDWCxVQUFVLEVBQUUsTUFBTTtRQUNsQixLQUFLLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1FBQ2pDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDdkIsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDN0IsWUFBWSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztLQUN0QyxDQUFDLENBQUE7QUFDTixDQUFDLENBQUE7QUFFRCxJQUFJLGdCQUFnQixHQUFHLFVBQUMsTUFBc0I7SUFDMUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDO1FBQ1gsVUFBVSxFQUFFLFNBQVM7UUFDckIsS0FBSyxFQUFFLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUNqQyxPQUFPLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUN6QixPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQztRQUM3QixZQUFZLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQztLQUM1QixDQUFDLENBQUE7QUFDTixDQUFDLENBQUE7QUFFRCxJQUFJLGNBQWMsR0FBRyxVQUFDLE1BQXNCO0lBQ3hDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUNYLFVBQVUsRUFBRSxTQUFTO1FBQ3JCLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7UUFDakMsR0FBRyxFQUFFLE1BQU07UUFDWCxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUN2QixPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQztRQUM1QixZQUFZLEVBQUUsR0FBRyxDQUFDLGdCQUFnQixDQUFDO0tBQ3RDLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQTtBQUVELElBQUksZ0JBQWdCLEdBQUcsVUFBQyxNQUFzQjtJQUMxQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUM7UUFDWCxVQUFVLEVBQUUsU0FBUztRQUNyQixLQUFLLEVBQUUsa0JBQWtCLENBQUMsTUFBTSxDQUFDO1FBQ2pDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUM7UUFDdkIsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7UUFDakUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztLQUN0QyxDQUFDLENBQUE7QUFDTixDQUFDLENBQUE7QUFLRCxJQUFJLFVBQVUsR0FBRyxVQUFDLFVBQWlCLEVBQUUsT0FBYztJQUUvQyxJQUFJLE1BQU0sR0FBRyxVQUFDLEdBQVE7UUFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNyQixDQUFDLENBQUE7SUFFRCxJQUFJLFNBQVMsR0FBRyxVQUFDLEdBQVE7UUFDckIsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM5QixFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFBO1FBQ25CLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXRCLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRXZCLENBQUMsQ0FBQTtJQUVELElBQUksSUFBSSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFckMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDOUIsQ0FBQztJQUNELElBQUksTUFBTSxHQUFhLEVBQUUsQ0FBQTtJQUN6QixHQUFHLENBQUMsQ0FBVSxVQUF3QixFQUF4QixLQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFqQyxjQUFLLEVBQUwsSUFBaUMsQ0FBQztRQUFsQyxJQUFJLENBQUMsU0FBQTtRQUNOLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQUMsUUFBUSxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQzlCO0lBRUQsSUFBSSxRQUFRLEdBQWlDLEVBQUUsQ0FBQTtJQUUvQyxHQUFHLENBQUMsQ0FBWSxVQUFJLEVBQWYsZ0JBQU8sRUFBUCxJQUFlLENBQUM7UUFBaEIsSUFBSSxHQUFHLEdBQUksSUFBSSxJQUFSO1FBSVIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUNELFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBRXpCLElBQUksU0FBUyxHQUFXLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEQsSUFBSSxLQUFLLEdBQVcsU0FBUyxDQUFDO1FBQzlCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzNDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzlCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2hELFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDZCxFQUFFLENBQUMsQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDckIsUUFBUSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtnQkFDeEIsQ0FBQztnQkFDRCxRQUFRLENBQUE7WUFDWixDQUFDO1FBQ0wsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxTQUFTLElBQUksR0FBRyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDaEQsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNkLFFBQVEsQ0FBQTtZQUNaLENBQUM7UUFDTCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDckIsT0FBTyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNKLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUMzRCxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7S0FDSjtJQUtELElBQUksZ0JBQWdCLEdBQUcsR0FBRyxDQUFBO0lBQzFCLEdBQUcsQ0FBQyxDQUFpQixVQUF1QixFQUF2QixLQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUF2QyxjQUFZLEVBQVosSUFBdUMsQ0FBQztRQUF4QyxJQUFJLFFBQVEsU0FBQTtRQUNiLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0IsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2pELElBQUksYUFBYSxHQUFnQyxFQUFFLENBQUE7UUFDbkQsR0FBRyxDQUFDLENBQVksVUFBSSxFQUFmLGdCQUFPLEVBQVAsSUFBZSxDQUFDO1lBQWhCLElBQUksR0FBRyxHQUFJLElBQUksSUFBUjtZQUNSLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDO2dCQUFDLFFBQVEsQ0FBQztZQUVoQyxFQUFFLENBQUMsQ0FBWSxHQUFHLENBQUMsS0FBTSxDQUFDLFlBQVksSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUN4RCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUMzQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7Z0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDaEMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO29CQUN6QixhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUVKLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQTtnQkFDdEMsQ0FBQztZQUNMLENBQUM7U0FDSjtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBRTFDLEdBQUcsQ0FBQyxDQUFpQixVQUFTLEVBQXpCLHFCQUFZLEVBQVosSUFBeUIsQ0FBQztZQUExQixJQUFJLFFBQVEsR0FBSSxTQUFTLElBQWI7WUFDYixJQUFJLDBCQUEwQixHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRywwQkFBMEIsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDcEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDckMsQ0FBQztTQUNKO0tBQ0o7SUFDRCxJQUFJLFdBQVcsR0FBRyxVQUFDLENBQUM7UUFDaEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5QyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsSUFBSSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzlDLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQzdCLENBQUMsQ0FBQTtJQUVELElBQUksUUFBUSxHQUFHLFVBQUMsS0FBSztRQUlqQixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNqRCxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQyxFQUFFLENBQUMsSUFBTyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDckQsR0FBRyxDQUFDLENBQVUsVUFBVSxFQUFuQixzQkFBSyxFQUFMLElBQW1CLENBQUM7WUFBcEIsSUFBSSxDQUFDLEdBQUksVUFBVSxJQUFkO1lBQ04sRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDaEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDZixLQUFLLENBQUE7WUFDVixDQUFDO1NBQ0o7SUFDTCxDQUFDLENBQUE7SUFFRCxJQUFNLHlCQUF5QixHQUFHLENBQUMsZUFBZSxFQUFFLG9CQUFvQixFQUFFLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFBO0lBQy9HLElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQTtJQUNuQixHQUFHLENBQUMsQ0FBaUIsVUFBdUIsRUFBdkIsS0FBQSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBdkMsY0FBWSxFQUFaLElBQXVDLENBQUM7UUFBeEMsSUFBSSxRQUFRLFNBQUE7UUFDYixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDL0MsR0FBRyxDQUFDLENBQW1CLFVBQXlCLEVBQTNDLHFDQUFjLEVBQWQsSUFBMkMsQ0FBQztZQUE1QyxJQUFJLFVBQVUsR0FBSSx5QkFBeUIsSUFBN0I7WUFDZixVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBQSxDQUFDLElBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxhQUFhLElBQUksVUFBVSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUN0STtLQUNKO0lBQ0QsR0FBRyxDQUFDLENBQW1CLFVBQXlCLEVBQTNDLHFDQUFjLEVBQWQsSUFBMkMsQ0FBQztRQUE1QyxJQUFJLFVBQVUsR0FBSSx5QkFBeUIsSUFBN0I7UUFDZixHQUFHLENBQUMsQ0FBZSxVQUFzQixFQUF0QixLQUFBLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBcEMsY0FBVSxFQUFWLElBQW9DLENBQUM7WUFBckMsSUFBSSxNQUFNLFNBQUE7WUFDWCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQztnQkFBQyxRQUFRLENBQUM7WUFDakUsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFBO1lBQ3RCLEdBQUcsQ0FBQyxDQUFZLFVBQUksRUFBZixnQkFBTyxFQUFQLElBQWUsQ0FBQztnQkFBaEIsSUFBSSxHQUFHLEdBQUksSUFBSSxJQUFSO2dCQUNSLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDakYsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDM0IsQ0FBQzthQUNKO1lBRUQsTUFBTSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFDakIsS0FBSyxlQUFlO29CQUNoQixRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BCLEtBQUssZUFBZSxDQUFDO2dCQUNyQixLQUFLLG1CQUFtQjtvQkFDcEIsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQzt3QkFDeEMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUM1QixNQUFNLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7d0JBQ2pDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxLQUFLLENBQUM7Z0JBQ1YsS0FBSyxvQkFBb0I7b0JBQ3JCLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDbkIsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUM1QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTt3QkFDcEMsQ0FBQztvQkFDTCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDNUIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7d0JBQ3BDLENBQUM7b0JBQ0wsQ0FBQztvQkFDRCxLQUFLLENBQUM7WUFDZCxDQUFDO1NBQ0o7S0FDSjtJQVVELElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtJQUNyRCxHQUFHLENBQUMsQ0FBYSxVQUFTLEVBQXJCLHFCQUFRLEVBQVIsSUFBcUIsQ0FBQztRQUF0QixJQUFJLElBQUksR0FBSSxTQUFTLElBQWI7UUFDVCxJQUFJLFdBQVcsR0FBVSxFQUFFLENBQUE7UUFDM0IsR0FBRyxDQUFDLENBQVksVUFBSSxFQUFmLGdCQUFPLEVBQVAsSUFBZSxDQUFDO1lBQWhCLElBQUksR0FBRyxHQUFJLElBQUksSUFBUjtZQUNSLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLElBQUksTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakYsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUN6QixDQUFDO1NBQ0o7UUFJQSxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7S0FDaEM7SUFpQkQsSUFBSSxLQUFLLEdBQUcsVUFBQyxDQUFTO1FBQ2xCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQTtJQUM5QyxDQUFDLENBQUE7SUFFRCxJQUFJLGtCQUFrQixHQUFHLFVBQUMsT0FBbUI7UUFDekMsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsVUFBQyxLQUFZO1lBQ2hCLEdBQUcsQ0FBQyxDQUFtQixVQUFFLEVBQXBCLGNBQWMsRUFBZCxJQUFvQixDQUFDO2dCQUFyQixJQUFJLFVBQVUsR0FBSSxFQUFFLElBQU47Z0JBQ2YsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFBO2dCQUNqQixHQUFHLENBQUMsQ0FBaUIsVUFBVSxFQUFWLEtBQUEsS0FBSyxDQUFDLElBQUksRUFBMUIsY0FBWSxFQUFaLElBQTBCLENBQUM7b0JBQTNCLElBQUksUUFBUSxTQUFBO29CQUNiLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsS0FBSyxHQUFHLElBQUksQ0FBQTt3QkFDWixLQUFLLENBQUE7b0JBQ1QsQ0FBQztpQkFDSjtnQkFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztvQkFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO2FBQzVCO1lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxHQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQzVFLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFBO0lBQ0wsQ0FBQyxDQUFBO0lBRUQsSUFBSSxpQkFBaUIsR0FBRyxVQUFDLEdBQVE7UUFDN0IsSUFBSSxVQUFVLEdBQWEsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5RyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDSixNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2hCLENBQUM7SUFDTCxDQUFDLENBQUE7SUFDRCxJQUFJLFlBQVksR0FBaUIsRUFBRSxDQUFBO0lBQ25DLEdBQUcsQ0FBQyxDQUFZLFVBQUksRUFBZixnQkFBTyxFQUFQLElBQWUsQ0FBQztRQUFoQixJQUFJLEdBQUcsR0FBSSxJQUFJLElBQVI7UUFDUixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDekIsUUFBUSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRXhELElBQUksS0FBSyxHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDckUsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDbEMsQ0FBQztLQUNKO0lBRUQsSUFBSSxNQUFNLEdBQUcsVUFBQyxLQUFhLEVBQUUsR0FBUTtRQUNqQyxJQUFJLEdBQUcsQ0FBQTtRQUNQLElBQUksQ0FBQztZQUNELEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdDLENBQUU7UUFBQSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckIsR0FBRyxHQUFHLE9BQU8sQ0FBQTtRQUNqQixDQUFDO1FBQ0QsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNWLEtBQUssWUFBWTtnQkFDYixLQUFLLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO2dCQUMxQixTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNwQixRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDMUIsS0FBSyxDQUFDO1lBQ1YsS0FBSyxPQUFPLENBQUM7WUFDYixLQUFLLGFBQWEsQ0FBQztZQUNuQixLQUFLLGtCQUFrQixDQUFDO1lBQ3hCLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxnQkFBZ0IsQ0FBQztZQUN0QixLQUFLLGFBQWE7Z0JBQ2QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxHQUFHLENBQUMsQ0FBQTtnQkFDcEMsU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDcEIsUUFBUSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUE7SUFDZCxDQUFDLENBQUE7SUFFRCxHQUFHLEdBQUcsSUFBSSxDQUFBO0lBQ1YsR0FBRyxDQUFDLENBQWMsVUFBTSxFQUFuQixrQkFBUyxFQUFULElBQW1CLENBQUM7UUFBcEIsSUFBSSxLQUFLLEdBQUksTUFBTSxJQUFWO1FBQ1YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztZQUFDLFFBQVEsQ0FBQztRQUM3QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDekIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNsQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUUvQixTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUNwQixRQUFRLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDMUIsUUFBUSxDQUFDO1lBQ2IsQ0FBQztZQUNELE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFNdEIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osS0FBSyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUUxQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLENBQUM7UUFDTCxDQUFDO0tBQ0o7SUFJRCxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDN0IsQ0FBQyxDQUFBO0FBRUQsSUFBSSxXQUFXLEdBQUcsVUFBQyxJQUFnQjtJQUMvQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUE7SUFDWixHQUFHLENBQUMsQ0FBYSxVQUFJLEVBQWhCLGdCQUFRLEVBQVIsSUFBZ0IsQ0FBQztRQUFqQixJQUFJLElBQUksR0FBSSxJQUFJLElBQVI7UUFDVCxJQUFJLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFBO0tBQzlCO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQTtBQUNmLENBQUMsQ0FBQTtBQUVELElBQUksaUJBQWlCLEdBQUcsVUFBQyxJQUFnQixFQUFFLGNBQXNCO0lBQzdELElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQTtJQUNsQixJQUFJLElBQUksR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLENBQUE7SUFDakMsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUMxRixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxDQUFBO0lBQzVDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNsQyxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9DLENBQUM7SUFDRCxNQUFNLENBQUMsU0FBUyxDQUFBO0FBQ3BCLENBQUMsQ0FBQTtBQUlELElBQUksV0FBVyxHQUFHLFVBQUMsU0FBdUI7SUFDdEMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7UUFBQyxNQUFNLENBQUM7SUFFbEMsR0FBRyxDQUFDLENBQWtCLFVBQXdCLEVBQXhCLEtBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQXpDLGNBQWEsRUFBYixJQUF5QyxDQUFDO1FBQTFDLElBQUksU0FBUyxTQUFBO1FBQ2QsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQztZQUFDLFFBQVEsQ0FBQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEQsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLElBQUksR0FBRyxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQzdELE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDbEMsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNoQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDekIsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNwQixDQUFDO0tBQ0o7QUFDTCxDQUFDLENBQUE7QUFFRCxJQUFJLFNBQVMsR0FBRyxVQUFDLENBQUM7SUFDZCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDdkIsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3ZCLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDdkIsQ0FBQztJQUNELE1BQU0sQ0FBQyxLQUFLLENBQUE7QUFDaEIsQ0FBQyxDQUFBO0FBRUQsSUFBSSxLQUFLLEdBQWlDO0lBQ3RDLFNBQVMsRUFBRSxVQUFDLEtBQWEsRUFBRSxHQUFRO1FBQy9CLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDO1FBRWhDLElBQUksTUFBTSxDQUFDO1FBQ1gsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1lBQ0QsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQ3ZELEVBQUUsQ0FBQyxDQUFDLE1BQU0sSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLENBQUM7UUFDTCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDdEIsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMvQixDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxFQUFFLFVBQUMsS0FBYSxFQUFFLEdBQVE7UUFDN0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDNUQsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ0osSUFBSSxHQUFHLENBQUE7WUFDUCxJQUFJLEtBQUssR0FBeUIsR0FBRyxDQUFDLEtBQUssQ0FBQTtZQUMzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLGFBQWEsSUFBSSxZQUFZLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUM1RixHQUFHLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFZLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN2RCxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxHQUFHLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBbUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25ELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDSixHQUFHLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBWSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckQsQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsQyxDQUFDO1FBQ0wsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLFlBQVksQ0FBQztRQUN4QixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQTtJQUNkLENBQUM7SUFFRCxLQUFLLEVBQUUsVUFBQyxLQUFhLEVBQUUsR0FBUTtRQUUzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLFNBQVMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzdGLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUM1RCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ0osSUFBSSxHQUFHLENBQUM7Z0JBQ1IsRUFBRSxDQUFDLENBQVUsR0FBRyxDQUFDLEtBQU0sQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztvQkFDMUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMxQyxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNKLEdBQUcsR0FBa0IsR0FBRyxDQUFDLEtBQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ3pELENBQUM7Z0JBRUQsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLGdCQUFnQixDQUFDLENBQUMsQ0FBQztvQkFDMUIsR0FBRyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNsQyxDQUFDO1lBQ0wsQ0FBQztRQUNMLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pCLEdBQUcsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQzlCLEdBQUcsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQTtZQUNuQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZCLEdBQUcsQ0FBQyxHQUFHLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdkMsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQTtRQUNsQixDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNmLENBQUM7Q0FDSixDQUFBO0FBQ0QsSUFBSSxZQUFZLEdBQUcsRUFBRSxDQUFBO0FBQ3JCLEdBQUcsQ0FBQyxDQUFXLFVBQWtCLEVBQWxCLEtBQUEsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBNUIsY0FBTSxFQUFOLElBQTRCLENBQUM7SUFBN0IsSUFBSSxFQUFFLFNBQUE7SUFDUCxJQUFJLEVBQUUsR0FBUSxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDdkIsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQTtDQUN4QjtBQUVELElBQUksR0FBRyxHQUFrQztJQUNyQyxTQUFTLEVBQUUsVUFBQyxDQUFTLEVBQUUsQ0FBUztRQUM1QixNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCxjQUFjLEVBQUUsVUFBQyxDQUFTLEVBQUUsQ0FBUztRQUNqQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEYsQ0FBQztJQUNELElBQUksRUFBRSxVQUFDLENBQVMsRUFBRSxDQUFTO1FBQ3ZCLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDYixDQUFDO0NBTUosQ0FBQTtBQUNELElBQUksVUFBVSxHQUFHLEVBQUUsQ0FBQTtBQUNuQixHQUFHLENBQUMsQ0FBVyxVQUFnQixFQUFoQixLQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQTFCLGNBQU0sRUFBTixJQUEwQixDQUFDO0lBQTNCLElBQUksRUFBRSxTQUFBO0lBQ1AsSUFBSSxFQUFFLEdBQVEsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDdkI7QUFBQSxDQUFDO0FBR0YsSUFBSSxVQUFVLEdBQVUsQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUM3QixJQUFJLEVBQUUsY0FBYztRQUNwQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDN0IsT0FBTyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDM0IsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztRQUNyQixZQUFZLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQztLQUNqQyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUM7UUFDUixJQUFJLEVBQUUsY0FBYztRQUNwQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDN0IsT0FBTyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUM7UUFDM0IsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztRQUNyQixZQUFZLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQztLQUNqQyxDQUFDLENBQUMsQ0FBQTtBQUlILElBQUksT0FBTyxHQUFVLEVBQUUsQ0FBQztBQUN4QixJQUFJLENBQUM7SUFDRCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUIsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzVDLENBQUM7QUFDTCxDQUFFO0FBQUEsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNWLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEdBQUcsRUFBRSxHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUM3RSxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN6QixDQUFDO0FBMkNELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7QUFDakMsVUFBVSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUMvQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBQ2xDLElBQUksSUFBSSxHQUFXLEVBQUUsQ0FBQTtBQUNyQixHQUFHLENBQUMsQ0FBWSxVQUFPLEVBQWxCLG1CQUFPLEVBQVAsSUFBa0IsQ0FBQztJQUFuQixJQUFJLEdBQUcsR0FBSSxPQUFPLElBQVg7SUFDUixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0NBQ0o7QUFDRCxHQUFHLENBQUMsQ0FBWSxVQUFJLEVBQWYsZ0JBQU8sRUFBUCxJQUFlLENBQUM7SUFBaEIsSUFBSSxHQUFHLEdBQUksSUFBSSxJQUFSO0lBQ1IsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvQixPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztDQUMxQjtBQUdELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBV3hDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0FBQ2xCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDN0IsRUFBRSxDQUFBLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsRUFBRSxDQUFBLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzFCLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ0osR0FBRyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM1QixDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuXG5cbmludGVyZmFjZSBTY3JlZXAgZXh0ZW5kcyBDcmVlcCwgU3VwZXJDcmVlcHtcbiAgICBqb2I/IDogSm9iO1xufVxuXG5jbGFzcyBTdXBlckNyZWVwIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZW5lcmd5OiBudW1iZXI7XG4gICAgYm9keToge1xuXG4gICAgICAgIC8qKiBPbmUgb2YgdGhlIGJvZHkgcGFydHMgY29uc3RhbnRzLiAqL1xuICAgICAgICB0eXBlOiBzdHJpbmc7XG5cbiAgICAgICAgLyoqIFRoZSByZW1haW5pbmcgYW1vdW50IG9mIGhpdCBwb2ludHMgb2YgdGhpcyBib2R5IHBhcnQuICovXG4gICAgICAgIGhpdHM6IG51bWJlclxuXG4gICAgfVtdO1xuXG5cbiAgICBob3dNYW55UGFydHMocGFydDpzdHJpbmcpOm51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy5ib2R5LmZpbHRlcihzID0+IHsgcmV0dXJuIChzLnR5cGUgPT0gcGFydCAmJiBzLmhpdHMgPiAwKSB9KS5sZW5ndGggXG4gICAgfVxuXG4gICAgaGFzUGFydChwYXJ0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgIHJldHVybiB0aGlzLmhvd01hbnlQYXJ0cyhwYXJ0KSA+IDBcbiAgICB9XG5cbiAgICBjYW5Nb3ZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KE1PVkUpO1xuICAgIH1cblxuICAgIGNhbldvcmsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoV09SSyk7XG4gICAgfVxuXG4gICAgY2FuSGVhbCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChIRUFMKTtcbiAgICB9XG5cbiAgICBjYW5BdHRhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoQVRUQUNLKTtcbiAgICB9XG5cbiAgICBjYW5TaG9vdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChSQU5HRURfQVRUQUNLKTtcbiAgICB9XG5cbiAgICBjYW5DbGFpbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChDTEFJTSk7XG4gICAgfVxuXG4gICAgbG9nKC4uLm1zZykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIltcIit0aGlzLm5hbWUrXCJdXCIsIC4uLm1zZylcbiAgICB9XG59XG5cblxuXG5cbmZ1bmN0aW9uIGFwcGx5TWl4aW5zKGRlcml2ZWRDdG9yOiBhbnksIGJhc2VDdG9yczogYW55W10pIHtcbiAgICBiYXNlQ3RvcnMuZm9yRWFjaChiYXNlQ3RvciA9PiB7XG4gICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2VDdG9yLnByb3RvdHlwZSkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICAgIGRlcml2ZWRDdG9yLnByb3RvdHlwZVtuYW1lXSA9IGJhc2VDdG9yLnByb3RvdHlwZVtuYW1lXTtcbiAgICAgICAgfSlcbiAgICB9KTsgXG59XG5cblxuYXBwbHlNaXhpbnMoQ3JlZXAsIFtTdXBlckNyZWVwXSlcblxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2xvYmFscy50c1wiIC8+XG5cbi8vcmVxdWlyZSgnZ2xvYmFscycpXG5cbi8vIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKFN1cGVyQ3JlZXAucHJvdG90eXBlKS5mb3JFYWNoKG5hbWUgPT4ge1xuLy8gICBDcmVlcC5wcm90b3R5cGVbbmFtZV0gPSBTdXBlckNyZWVwLnByb3RvdHlwZVtuYW1lXVxuLy8gfSlcblxudHlwZSBKb2JGdW5jID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiBudW1iZXI7XG50eXBlIENyZWVwRmlsdGVyID0gKGNyZWVwOiBTY3JlZXApID0+IGJvb2xlYW47XG50eXBlIENyZWVwQ21wID0gKGE6IENyZWVwLCBiOiBTY3JlZXApID0+IG51bWJlcjtcblxuXG5jb25zdCBKT0JfQ09NUExFVEUgPSA5OTlcbmNvbnN0IEVfQ1JBU0ggPSAtOTlcblxuaW50ZXJmYWNlIFBvc2l0aW9uRW50aXR5IHtcbiAgICBwb3M6IFJvb21Qb3NpdGlvblxuICAgIGlkOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIEVuZXJneUhvbGRlciBleHRlbmRzIFN0cnVjdHVyZSB7XG4gICAgZW5lcmd5OiBudW1iZXI7XG4gICAgZW5lcmd5Q2FwYWNpdHk6IG51bWJlcjtcbiAgICB0cmFuc2ZlckVuZXJneShjOiBDcmVlcClcbn1cblxuLy8gVE9ETzogcmUtYWRkIGNhbmRpZGF0ZSBmaWx0ZXJcbi8vIFRPRE86IGZpZ3VyZSBvdXQgYmV0dGVyIGlkbGUgc2l0dWF0aW9uXG4vLyBUT0RPOiBkZWFsIHdpdGggY3JlZXBzIGhhdmluZyBsZWZ0b3ZlciBlbmVyZ3ksIGZpeCBkZWxpdmVyIGpvYnMsIG1heWJlIHN3YXAgZW5kIGZvciAnZGVzaXJlZCBzb3VyY2UnIG9yIHNvbWVzdWNoXG4vLyBUT0RPOiB0YWtlIGNyZWVwIGxvY2FsaWN0eSBpbnRvIGFjY291bnQgd2hlbiBjb21wYXJpbmdcbi8vIFRPRE86IHRvd2VyIGxvZ2ljXG4vLyBUT0RPOiBidWlsZGVyLyByZXBhaXIgbG9naWNcbi8vIFRPRE86IHJvYWQgY3JlYXRvciAtLSBrZWVwIG1hcCBvZiByb2FkIHBvc2l0aW9ucywgcGF2ZSBtb3N0IHRyYXZlbGVkIHVucGF2ZWQgYXJlYVxuLy8gVE9ETyA6IG1heGltaXplIHVwZ3JhZGluZyFcbmNsYXNzIEpvYiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHN0YXJ0OiBQb3NpdGlvbkVudGl0eTtcbiAgICBlbmQ6IFBvc2l0aW9uRW50aXR5O1xuICAgIGpvYkZ1bmM6IEpvYkZ1bmM7XG4gICAgY2FuZGlkYXRlRmlsdGVyOiBDcmVlcEZpbHRlcjtcbiAgICBjYW5kaWRhdGVDbXA6IENyZWVwQ21wO1xuICAgIGNyZWVwOiBTY3JlZXA7IC8vIFNldCBkdXJpbmcgZXhlY3V0aW9uZ1xuICAgIGJvZHlSZXE6IEJvZHlQYXJ0W11cblxuICAgIGNvbnN0cnVjdG9yKG9wdHMgPSB7fSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBvcHRzWyduYW1lJ11cblxuICAgICAgICB2YXIgbnAgPSBvcHRzWyduYW1lUHJlZml4J11cbiAgICAgICAgaWYgKG5wICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKE1lbW9yeVtcImpvYkNvdW50c1wiXSA9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdID0ge307XG4gICAgICAgICAgICBpZiAoTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSA9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSA9IDA7XG4gICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdICs9IDE7XG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBucCArIFwiX1wiICsgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhcnQgPSBvcHRzWydzdGFydCddXG4gICAgICAgIHRoaXMuZW5kID0gb3B0c1snZW5kJ11cbiAgICAgICAgdGhpcy5qb2JGdW5jID0gb3B0c1snam9iRnVuYyddXG4gICAgICAgIHRoaXMuYm9keVJlcSA9IG9wdHNbJ2JvZHlSZXEnXVxuICAgICAgICB0aGlzLmNhbmRpZGF0ZUNtcCA9IG9wdHNbJ2NhbmRpZGF0ZUNtcCddXG4gICAgICAgIGlmICh0aGlzLmJvZHlSZXEgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkJhZCBqb2IhISwgbm8gYm9keSBcIiArIHRoaXMubmFtZSlcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG9wdHNbJ2JvZHlSZXEnXSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkJhZCBqb2I9XCIrdGhpcy5uYW1lKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdG9KU09OKCkge1xuICAgICAgICB2YXIgam9iRm46IGFueSA9IHRoaXMuam9iRnVuYztcbiAgICAgICAgdmFyIGZpbHRlckZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUZpbHRlcjtcbiAgICAgICAgdmFyIGNtcEZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUNtcDtcbiAgICAgICAgdmFyIHJldCA9IHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICAgIHN0YXJ0OiB0aGlzLnN0YXJ0LmlkLFxuICAgICAgICAgICAgam9iRnVuYzogUm9sZXNSZXZlcnNlW2pvYkZuXSxcbiAgICAgICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wUmV2ZXJzZVtjbXBGbl0sXG4gICAgICAgICAgICBib2R5UmVxOiB0aGlzLmJvZHlSZXFcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZW5kICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0WydlbmQnXSA9IHRoaXMuZW5kLmlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXRcbiAgICB9XG59XG5cbnZhciBwYXJzZUpvYiA9IChrOiBzdHJpbmcsIHYpOiBhbnkgPT4ge1xuICAgIHN3aXRjaCAoaykge1xuICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgIGNhc2UgJ2VuZCc6XG4gICAgICAgICAgICB2YXIgciA9IEdhbWUuZ2V0T2JqZWN0QnlJZCh2KVxuICAgICAgICAgICAgaWYgKHIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGQUlMRUQgVE8gTE9BRCBcIiArIGsgKyBcIiBmcm9tIFwiICsgdilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2pvYkZ1bmMnOlxuICAgICAgICAgICAgcmV0dXJuIFJvbGVzW3ZdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NhbmRpZGF0ZUNtcCc6XG4gICAgICAgICAgICByZXR1cm4gQ21wW3ZdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgICAgICByZXR1cm4gdi5tYXAobz0+IHsgcmV0dXJuIG5ldyBKb2IobykgfSlcbiAgICB9XG4gICAgcmV0dXJuIHZcbn1cblxudmFyIHNldEpvYiA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4ge1xuICAgIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV0gPSBjcmVlcC5uYW1lO1xuICAgIGpvYi5jcmVlcCA9IGNyZWVwO1xuICAgIGNyZWVwLmpvYiA9IGpvYjtcbn1cblxudmFyIGNsZWFySm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiB7XG4gICAgZGVsZXRlIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgZGVsZXRlIGpvYi5jcmVlcFxuICAgIGRlbGV0ZSBjcmVlcC5qb2Jcbn1cblxudmFyIGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMgPSAoc3RydWN0VHlwZXM6IHN0cmluZ1tdKTogU3RydWN0dXJlW10gPT4ge1xuICAgIHZhciBzdHJ1Y3RzID0gW11cbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICBzdHJ1Y3RzLnB1c2guYXBwbHkoZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tKHJvb21OYW1lLCBzdHJ1Y3RUeXBlcykpXG4gICAgfVxuICAgIHJldHVybiBzdHJ1Y3RzO1xufVxuXG52YXIgbmVlZHNFbmVyZ3kgPSAoczogU3RydWN0dXJlKTogYm9vbGVhbiA9PiB7XG4gICAgc3dpdGNoIChzLnN0cnVjdHVyZVR5cGUpIHtcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfU1RPUkFHRTpcbiAgICAgICAgICAgIHJldHVybiAoPFN0b3JhZ2U+cykuc3RvcmUuZW5lcmd5IDwgKDxTdG9yYWdlPnMpLnN0b3JlQ2FwYWNpdHk7XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1RPV0VSOlxuICAgICAgICAgICAgcmV0dXJuICg8VG93ZXI+cykuZW5lcmd5IDwgKDxUb3dlcj5zKS5lbmVyZ3lDYXBhY2l0eSAqIC43NVxuICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTiwgU1RSVUNUVVJFX0VYVEVOU0lPTiwgU1RSVUNUVVJFX0xJTkssIFNUUlVDVFVSRV9QT1dFUl9TUEFXTjpcbiAgICAgICAgICAgIHJldHVybiAoPEVuZXJneUhvbGRlcj5zKS5lbmVyZ3kgPCAoPEVuZXJneUhvbGRlcj5zKS5lbmVyZ3lDYXBhY2l0eVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2Vcbn1cblxudmFyIGdldE15U3RydWN0dXJlc0luUm9vbSA9IChyb29tTmFtZTogc3RyaW5nLCBzdHJ1Y3RUeXBlczogc3RyaW5nW10pOiBTdHJ1Y3R1cmVbXSA9PiB7XG4gICAgdmFyIHJvb206IFJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXVxuICAgIGlmIChyb29tID09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUT0RPOiBMb2c/XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FuJ3QgZmluZCByb29tIFwiICsgcm9vbU5hbWUpXG4gICAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgICBpZiAocm9vbVtcIm15X3N0cnVjdHVyZXNcIl0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdID0gcm9vbS5maW5kKEZJTkRfTVlfU1RSVUNUVVJFUylcbiAgICB9XG4gICAgcmV0dXJuIHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdLmZpbHRlcihzPT4geyByZXR1cm4gc3RydWN0VHlwZXMuaW5kZXhPZihzLnN0cnVjdHVyZVR5cGUpID4gLTEgfSlcbn1cblxudmFyIGZpbmROZWFyZXN0U3RvcmFnZSA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogU3RydWN0dXJlID0+IHtcbiAgICB2YXIgc3RvcmVzID0gZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tKHRhcmdldC5wb3Mucm9vbU5hbWUsIFtTVFJVQ1RVUkVfU1RPUkFHRV0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJblJvb20odGFyZ2V0LnBvcy5yb29tTmFtZSwgW1NUUlVDVFVSRV9UT1dFUl0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zKFtTVFJVQ1RVUkVfU1RPUkFHRV0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zKFtTVFJVQ1RVUkVfU1BBV05dKS5maWx0ZXIobmVlZHNFbmVyZ3kpXG4gICAgcmV0dXJuIHRhcmdldC5wb3MuZmluZENsb3Nlc3RCeVJhbmdlKHN0b3Jlcylcbn1cblxudmFyIGNyZWF0ZVBpY2t1cEpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICdjYXJyeScsXG4gICAgICAgIHN0YXJ0OiB0YXJnZXQsXG4gICAgICAgIGVuZDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydjYXJyeSddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZUZpbGxKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAnZmlsbCcsXG4gICAgICAgIHN0YXJ0OiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgZW5kOiB0YXJnZXQsXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydjYXJyeSddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZURlbGl2ZXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAnZGVsaXZlcicsXG4gICAgICAgIHN0YXJ0OiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2RlbGl2ZXInXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydub29wJ10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZUJ1aWxkSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ3VwZ3JhZGUnLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGVuZDogdGFyZ2V0LFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIFdPUkssIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZVVwZ3JhZGVKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAndXBncmFkZScsXG4gICAgICAgIHN0YXJ0OiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgZW5kOiB0YXJnZXQsXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydjYXJyeSddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgTU9WRSwgTU9WRSwgV09SSywgV09SSywgV09SSywgV09SSywgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxuXG4vLyBUT0RPOiBBUEkgdG8gYWRkIGpvYnMsIHNvbWUgd2F5IHRvIGNvbWJpbmUgaW4tbWVtb3J5IGpvYnMgd2l0aCBpbi1jb2RlIGpvYnNcbi8vIGZpdG5lc3MgZnVuYyBmb3IgY2FuZGlkYXRlcyBiYXNlZCBvbiBkaXN0YW5jZS5cbnZhciBydW5BbGxKb2JzID0gKHN0YXRpY0pvYnM6IEpvYltdLCBtZW1Kb2JzOiBKb2JbXSkgPT4ge1xuXG4gICAgdmFyIGFkZEpvYiA9IChqb2I6IEpvYikgPT4ge1xuICAgICAgICBtZW1Kb2JzLnB1c2goam9iKVxuICAgIH1cblxuICAgIHZhciByZW1vdmVKb2IgPSAoam9iOiBKb2IpID0+IHtcbiAgICAgICAgdmFyIGlkeCA9IG1lbUpvYnMuaW5kZXhPZihqb2IpXG4gICAgICAgIGlmIChpZHggPCAwKSByZXR1cm5cbiAgICAgICAgbWVtSm9icy5zcGxpY2UoaWR4LCAxKVxuXG4gICAgICAgIGlkeCA9IGpvYnMuaW5kZXhPZihqb2IpXG4gICAgICAgIGpvYnMuc3BsaWNlKGlkeCwgMSlcblxuICAgIH1cblxuICAgIHZhciBqb2JzID0gc3RhdGljSm9icy5jb25jYXQobWVtSm9icylcblxuICAgIGlmIChNZW1vcnlbJ2pvYl93b3JrZXJzJ10gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVwbGFjaW5nIHdvcmtlciBtYXAxISFcIilcbiAgICAgICAgTWVtb3J5Wydqb2Jfd29ya2VycyddID0ge31cbiAgICB9XG4gICAgdmFyIGNyZWVwczogU2NyZWVwW10gPSBbXVxuICAgIGZvciAodmFyIG4gb2YgT2JqZWN0LmtleXMoR2FtZS5jcmVlcHMpKSB7XG4gICAgICAgIGlmIChHYW1lLmNyZWVwc1tuXS5zcGF3bmluZykgY29udGludWU7XG4gICAgICAgIGNyZWVwcy5wdXNoKEdhbWUuY3JlZXBzW25dKVxuICAgIH1cblxuICAgIHZhciBzZWVuSm9iczogeyBbaW5kZXg6IHN0cmluZ106IGJvb2xlYW4gfSA9IHt9XG5cbiAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAvLyBjaGVjayBpZiBzdGlsbCB2YWxpZFxuXG4gICAgICAgIC8vIENoZWNrIGZvciBEdXBlXG4gICAgICAgIGlmIChzZWVuSm9ic1tqb2IubmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRFVQTElDQVRFIEpPQiBJTiBMSVNUISEgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgfVxuICAgICAgICBzZWVuSm9ic1tqb2IubmFtZV0gPSB0cnVlXG5cbiAgICAgICAgdmFyIGNyZWVwTmFtZTogc3RyaW5nID0gTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICAgICAgdmFyIGNyZWVwOiBTY3JlZXAgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnNvbGUubG9nKGpvYi5uYW1lLCBjcmVlcE5hbWUsIGpvYi5zdGFydClcbiAgICAgICAgaWYgKGNyZWVwTmFtZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNyZWVwID0gR2FtZS5jcmVlcHNbY3JlZXBOYW1lXVxuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCA9PSB1bmRlZmluZWQgfHwgam9iLnN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0IGRpc2FwcGVhcmVkIGZvciBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihqb2IpXG4gICAgICAgICAgICAgICAgaWYgKGNyZWVwICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgam9iKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCA9PSB1bmRlZmluZWQgfHwgam9iLnN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0IGRpc2FwcGVhcmVkIGZvciBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihqb2IpXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyBcIiArIGNyZWVwLm5hbWUgKyBcIiB0byBkbyBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSm9iIGNyZWF0b3JzXG5cbiAgICAvLyBHYXRoZXIgZHJvcHBlZCByZXNvdXJjZXNcbiAgICB2YXIgR0FUSEVSX1RIUkVTSE9MRCA9IDIwMCAvLyBUT0RPOiBTZXQgYmFzZWQgb24gYXZhaWxhYmxlIGNyZWVwc1xuICAgIGZvciAodmFyIHJvb21OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUucm9vbXMpKSB7XG4gICAgICAgIHZhciByb29tID0gR2FtZS5yb29tc1tyb29tTmFtZV1cbiAgICAgICAgdmFyIHJlc291cmNlcyA9IHJvb20uZmluZChGSU5EX0RST1BQRURfUkVTT1VSQ0VTKVxuICAgICAgICB2YXIgcmVzb3VyY2VzQnlJZDogeyBbaW5kZXg6IHN0cmluZ106IG51bWJlciB9ID0ge31cbiAgICAgICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGpvYi5uYW1lLCBqb2Iuc3RhcnQpXG4gICAgICAgICAgICBpZiAoKDxSZXNvdXJjZT5qb2Iuc3RhcnQpLnJlc291cmNlVHlwZSA9PSBSRVNPVVJDRV9FTkVSR1kpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhqb2IubmFtZSwgam9iLmNyZWVwKVxuICAgICAgICAgICAgICAgIGlmIChqb2IuY3JlZXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSArPSAoam9iLmNyZWVwLmNhcnJ5Q2FwYWNpdHkgLSBqb2IuY3JlZXAuY2FycnkuZW5lcmd5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHdhbnQgb25lIGVtcHR5IGpvYiBwZXIgcmVzb3VyY2UsIGRlZmF1bHQgdG8gaW5maW5pdHkgaWYgdGhlcmUgYXJlIG5vIGNyZWVwc1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gKz0gOTk5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc291cmNlc0J5SWQpKVxuXG4gICAgICAgIGZvciAodmFyIHJlc291cmNlIG9mIHJlc291cmNlcykge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRseUFsbG9jYXRlZENhcGFjaXR5ID0gcmVzb3VyY2VzQnlJZFtyZXNvdXJjZS5pZF0gfHwgMDtcbiAgICAgICAgICAgIGlmICgocmVzb3VyY2UuYW1vdW50IC0gY3VycmVudGx5QWxsb2NhdGVkQ2FwYWNpdHkpID4gR0FUSEVSX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IHBpY2t1cCBqb2JcIilcbiAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlUGlja3VwSm9iKHJlc291cmNlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgbmVlZHNSZXBhaXIgPSAocykgPT4ge1xuICAgICAgICBpZiAocy5zdHJ1Y3R1cmVUeXBlPT1TVFJVQ1RVUkVfV0FMTCkge1xuICAgICAgICAgICAgcmV0dXJuIHMuaGl0cyA8IE1hdGgubWluKHMuaGl0c01heCwgNTAwMDApXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMuc3RydWN0dXJlVHlwZSA9PSBTVFJVQ1RVUkVfUkFNUEFSVCkge1xuICAgICAgICAgICAgcmV0dXJuIHMuaGl0cyA8IE1hdGgubWluKHMuaGl0c01heCwgMTAwMDApXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHMuaGl0cyA8IHMuaGl0c01heFxuICAgIH1cblxuICAgIHZhciBydW5Ub3dlciA9ICh0b3dlcikgPT4ge1xuICAgICAgICAvLyBGaW5kIHN0cnVjdHVyZXMsIHNvcnQgYnkgcHJpb3JpdHk/XG4gICAgICAgIC8vIEV2ZW50dWFsbHkgdG93ZXIgY2FuIGNvbnN1bWUgam9iczo/IG9yIGFsd2F5cyBzZXBhcmF0ZVxuICAgICAgICAvLyBUT0RPOiBidWlsZGluZ3Mvcm9hZHMvcmFtcGFydHMvd2FsbHNcbiAgICAgICAgdmFyIHN0cnVjdHVyZXMgPSB0b3dlci5yb29tLmZpbmQoRklORF9TVFJVQ1RVUkVTKVxuICAgICAgICBzdHJ1Y3R1cmVzLnNvcnQoKGEsIGIpID0+IHsgcmV0dXJuIGEuaGl0cyAtIGIuaGl0cyB9KVxuICAgICAgICBmb3IgKHZhciBzIG9mIHN0cnVjdHVyZXMpIHtcbiAgICAgICAgICAgIGlmIChuZWVkc1JlcGFpcihzKSkge1xuICAgICAgICAgICAgICAgICB0b3dlci5yZXBhaXIocylcbiAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUgPSBbU1RSVUNUVVJFX1RPV0VSLCBTVFJVQ1RVUkVfQ09OVFJPTExFUiwgU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OXVxuICAgIHZhciBzdHJ1Y3R1cmVzID0ge31cbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICB2YXIgcm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdO1xuICAgICAgICB2YXIgcm9vbVN0cnVjdHVyZXMgPSByb29tLmZpbmQoRklORF9TVFJVQ1RVUkVTKVxuICAgICAgICBmb3IgKHZhciBzdHJ1Y3RUeXBlIG9mIFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUpIHtcbiAgICAgICAgICAgIHN0cnVjdHVyZXNbc3RydWN0VHlwZV0gPSAoc3RydWN0dXJlc1tzdHJ1Y3RUeXBlXSB8fCBbXSkuY29uY2F0KHJvb21TdHJ1Y3R1cmVzLmZpbHRlcihzPT4geyByZXR1cm4gcy5zdHJ1Y3R1cmVUeXBlID09IHN0cnVjdFR5cGUgfSkpXG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgc3RydWN0VHlwZSBvZiBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFKSB7XG4gICAgICAgIGZvciAodmFyIHN0cnVjdCBvZiBzdHJ1Y3R1cmVzW3N0cnVjdFR5cGVdKSB7XG4gICAgICAgICAgICBpZiAoc3RydWN0Lm93bmVyICYmIHN0cnVjdC5vd25lci51c2VybmFtZSAhPSAnb21nYmVhcicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIGpvYnNGb3JTdHJ1Y3QgPSBbXVxuICAgICAgICAgICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoam9iLnN0YXJ0ICYmIGpvYi5zdGFydC5pZCA9PSBzdHJ1Y3QuaWQgfHwgKGpvYi5lbmQgJiYgam9iLmVuZC5pZCA9PSBzdHJ1Y3QuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYnNGb3JTdHJ1Y3QucHVzaChqb2IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIG5lZWQgbmV3IGpvYnMgbm93XG4gICAgICAgICAgICBzd2l0Y2ggKHN0cnVjdFR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjpcbiAgICAgICAgICAgICAgICAgICAgcnVuVG93ZXIoc3RydWN0KVxuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOOlxuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX0VYVEVOU0lPTjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdC5lbmVyZ3kgPCBzdHJ1Y3QuZW5lcmd5Q2FwYWNpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqb2JzRm9yU3RydWN0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZUZpbGxKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9DT05UUk9MTEVSOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RydWN0LmxldmVsIDwgNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDw9IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlVXBncmFkZUpvYihzdHJ1Y3QpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDw9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlVXBncmFkZUpvYihzdHJ1Y3QpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIGlmIChyb29tLmNvbnRyb2xsZXIgJiYgcm9vbS5jb250cm9sbGVyLm93bmVyICYmIHJvb20uY29udHJvbGxlci5vd25lci51c2VybmFtZSA9PSAnb21nYmVhcicpXG4gICAgLy8gICAgIGZvciAodmFyIHN0cnVjdCBvZiByb29tU3RydWN0dXJlcykge1xuICAgIC8vICAgICAgICAgLy8gdG9kbyBvbmx5IHJlcGFpciB3YWxscyBpbiBteXJvb21zXG4gICAgLy8gICAgICAgICBpZiAoc3RydWN0LmhpdHMgPCBNYXRoLm1pbihzdHJ1Y3QuaGl0c01heCwgNTAwMDApIHtcbiAgICAvLyAgICAgICAgICAgICAvLyBjaGVjayBpdCBkb2VzbnQgZXhpc3QsIHRha2UgaW50byBhY291bnQgYWJvdmUgYXMgd2VsbFxuICAgIC8vICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVSZXBhaXJKb2Ioc3RydWN0KSlcbiAgICAvLyAgICAgICAgIH1cbiAgICAvLyAgICAgfVxuICAgIC8vIH1cbiAgICB2YXIgcm9vbVNpdGVzID0gcm9vbS5maW5kKEZJTkRfTVlfQ09OU1RSVUNUSU9OX1NJVEVTKVxuICAgIGZvciAodmFyIHNpdGUgb2Ygcm9vbVNpdGVzKSB7XG4gICAgICAgIHZhciBqb2JzRm9yU2l0ZTogSm9iW10gPSBbXVxuICAgICAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCAmJiBqb2Iuc3RhcnQuaWQgPT0gc3RydWN0LmlkIHx8IChqb2IuZW5kICYmIGpvYi5lbmQuaWQgPT0gc3RydWN0LmlkKSkge1xuICAgICAgICAgICAgICAgIGpvYnNGb3JTaXRlLnB1c2goam9iKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdG9kbyBvbmx5IHJlcGFpciB3YWxscyBpbiBteXJvb21zXG4gICAgICAgIC8vIHRyYWNrIGJ1aWxkcmVycyBvbiBhbGwgc2l0ZXMgLS0gbWF5YmUgYSBjb25zdHJ1Y3Rpb24gZm9yZW1hbiBzbyB3ZSBkb250IHNwYXduIHRvbnMgb2Ygam9icyBhbmRcbiAgICAgICAgIGFkZEpvYihjcmVhdGVCdWlsZEpvYihzaXRlKSlcbiAgICB9XG5cblxuIFxuXG4gICAgLy8gTWluZSBhbGwgc291cmNlc1xuICAgIC8vIEZpbmQgYWxsIHNvdXJjZXMgaW4gcm9vbXMsIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIGpvYiB0byBtaW5lIGVhY2hcblxuICAgIC8vIEJ1aWxkIHRoaW5nc1xuICAgIC8vIFJlcGFpciB0aGluZ3NcbiAgICAvLyBldGMuXG5cbiAgICAvLyBEZWZlbmQsIGF0dGFjaywgZXRjLlxuXG4gICAgLy8gQWxsb2NhdGUgam9ic1xuXG5cbiAgICB2YXIgbm9Kb2IgPSAoYzogU2NyZWVwKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIHJldHVybiBjLmpvYiA9PSB1bmRlZmluZWQgfHwgYy5qb2IgPT0gbnVsbFxuICAgIH1cblxuICAgIHZhciBnZXRDYW5kaWRhdGVGaWx0ZXIgPSAoYm9keVJlcTogQm9keVBhcnRbXSk6IENyZWVwRmlsdGVyID0+IHtcbiAgICAgICAgdmFyIGJyID0gYm9keVJlcS5zbGljZSgwKVxuICAgICAgICByZXR1cm4gKGNyZWVwOiBDcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgZm9yICh2YXIgbmVlZGVkUGFydCBvZiBicikge1xuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYm9keVBhcnQgb2YgY3JlZXAuYm9keSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9keVBhcnQudHlwZSA9PSBuZWVkZWRQYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJvayB0byBhc3NpZ24gXCIgICsgSlNPTi5zdHJpbmdpZnkoY3JlZXAuYm9keSkgKyBcIiB0byBcIisgYm9keVJlcSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZpbmRTdWl0YWJsZUNyZWVwID0gKGpvYjogSm9iKTogU2NyZWVwID0+IHtcbiAgICAgICAgdmFyIGNhbmRpZGF0ZXM6IFNjcmVlcFtdID0gY3JlZXBzLmZpbHRlcihub0pvYikuZmlsdGVyKGdldENhbmRpZGF0ZUZpbHRlcihqb2IuYm9keVJlcSkpLnNvcnQoam9iLmNhbmRpZGF0ZUNtcClcbiAgICAgICAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbmRpZGF0ZXNbMF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgbmVlZGVkQ3JlZXBzOiBCb2R5UGFydFtdW10gPSBbXVxuICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgIGlmIChqb2IuY3JlZXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvL3BpY2sgbmV3IG9uZVxuICAgICAgICBjb25zb2xlLmxvZyhcIk5lZWQgdG8gcmVwbGFjZSBjcmVlcCBmb3Igam9iIFwiICsgam9iLm5hbWUpXG4gICAgICAgIC8vIFRPRE8gZmlndXJlIG91dCBjdXJyeWluZyB0byBwYXNzIGpvYiBpbnRvIGNtcCBmdW5jdGlvblxuICAgICAgICB2YXIgY3JlZXAgPSBmaW5kU3VpdGFibGVDcmVlcChqb2IpXG4gICAgICAgIGlmIChjcmVlcCAhPSBudWxsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlBpY2tlZCBjcmVlcCBmb3Igam9iIFwiICsgam9iLm5hbWUgKyBcIiBnb3QgXCIgKyBjcmVlcC5uYW1lKTtcbiAgICAgICAgICAgIHNldEpvYihjcmVlcCwgam9iKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gY2FuZGlkYXRlcyBmb3Igam9iPVwiICsgam9iLm5hbWUgKyBcIiAgXCIgKyBqb2IuYm9keVJlcSlcbiAgICAgICAgICAgIG5lZWRlZENyZWVwcy5wdXNoKGpvYi5ib2R5UmVxKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJ1bkpvYiA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgICAgIHZhciByZXRcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldCA9IGNyZWVwLmpvYi5qb2JGdW5jKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNyYXNoIHJ1bm5pbmcgam9iIFwiICsgY3JlZXAuam9iLm5hbWUgKyBcIiBhbmQgbXNnIFwiICsgZXgpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhleC5zdGFjaylcbiAgICAgICAgICAgIHJldCA9IEVfQ1JBU0hcbiAgICAgICAgfVxuICAgICAgICBzd2l0Y2ggKHJldCkge1xuICAgICAgICAgICAgY2FzZSBKT0JfQ09NUExFVEU6XG4gICAgICAgICAgICAgICAgY3JlZXAubG9nKFwiSm9iIGNvbXBsZXRlIVwiKVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgRV9DUkFTSDpcbiAgICAgICAgICAgIGNhc2UgRVJSX05PVF9GT1VORDpcbiAgICAgICAgICAgIGNhc2UgRVJSX0lOVkFMSURfVEFSR0VUOlxuICAgICAgICAgICAgY2FzZSBFUlJfRlVMTDpcbiAgICAgICAgICAgIGNhc2UgRVJSX0lOVkFMSURfQVJHUzpcbiAgICAgICAgICAgIGNhc2UgRVJSX05PVF9PV05FUjpcbiAgICAgICAgICAgICAgICBjcmVlcC5sb2coXCJKb2IgRmFpbGVkISEgZXJyPVwiICsgcmV0KVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0XG4gICAgfVxuXG4gICAgam9iID0gbnVsbFxuICAgIGZvciAodmFyIGNyZWVwIG9mIGNyZWVwcykge1xuICAgICAgICBpZiAoY3JlZXAuc3Bhd25pbmcpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoY3JlZXAuam9iICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3JlZXAubG9nKFwiam9iPVwiICsgY3JlZXAuam9iLm5hbWUpXG4gICAgICAgICAgICBpZiAoY3JlZXAuam9iLnN0YXJ0ID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE86IENsZWFudXBcbiAgICAgICAgICAgICAgICByZW1vdmVKb2IoY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBydW5Kb2IoY3JlZXAsIGpvYilcbiAgICAgICAgLy8gfSBlbHNlIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPiAwKSB7XG4gICAgICAgIC8vICAgICB2YXIgaiA9IGNyZWF0ZURlbGl2ZXJKb2IoY3JlZXApXG4gICAgICAgIC8vICAgICBhZGRKb2IoailcbiAgICAgICAgLy8gICAgIHNldEpvYihjcmVlcCwgailcbiAgICAgICAgLy8gICAgIHJ1bkpvYihjcmVlcCwgailcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNyZWVwLmxvZyhcIk5vdGhpbmcgdG8gZG9cIilcbiAgICAgICAgICAgIC8vIFRPRE86IENvdW50ICMgb2YgaWRsZSBib3RzLCBldmVudHVhbGx5IGN1bGwgd2Vhay9vbGQgb25lc1xuICAgICAgICAgICAgaWYgKEdhbWUuZmxhZ3NbJ0lkbGUnXSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tb3ZlVG8oR2FtZS5mbGFnc1snSWRsZSddKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQnVpbGRpbmcgYmFzZWQgam9icz8hXG4gICAgLy8gbmVlZCB0byBzcGF3biBhIGNyZWVwXG4gICAgc3Bhd25DcmVlcHMobmVlZGVkQ3JlZXBzKVxufVxuXG52YXIgZ2V0Qm9keUNvc3QgPSAoYm9keTogQm9keVBhcnRbXSk6IG51bWJlciA9PiB7XG4gICAgdmFyIGNvc3QgPSAwXG4gICAgZm9yICh2YXIgcGFydCBvZiBib2R5KSB7XG4gICAgICAgIGNvc3QgKz0gQk9EWVBBUlRfQ09TVFtwYXJ0XVxuICAgIH1cbiAgICByZXR1cm4gY29zdFxufVxuXG52YXIgZ2V0Qm9keURlZmluaXRpb24gPSAoYm9keTogQm9keVBhcnRbXSwgZW5lcmd5Q2FwYWNpdHk6IG51bWJlcik6IEJvZHlQYXJ0W10gPT4ge1xuICAgIHZhciBib2R5UGFydHMgPSBbXVxuICAgIHZhciBjb3N0ID0gZ2V0Qm9keUNvc3QoYm9keSlcbiAgICBjb25zb2xlLmxvZyhcIkJvZHkgY29zdHMgXCIgKyBjb3N0KVxuICAgIHZhciBib2R5Q291bnRzID0gTWF0aC5taW4oTWF0aC5mbG9vcihlbmVyZ3lDYXBhY2l0eSAvIGNvc3QpLCBNYXRoLmZsb29yKDUwIC8gYm9keS5sZW5ndGgpKVxuICAgIGNvbnNvbGUubG9nKFwiR29pbmcgdG8gYnVpbGQgeFwiICsgYm9keUNvdW50cylcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHlDb3VudHM7IGkrKykge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShib2R5UGFydHMsIGJvZHkpXG4gICAgfVxuICAgIHJldHVybiBib2R5UGFydHNcbn1cblxuXG4vLyBUT0RPOiBTb21lIHNvcnQgb2YgbGltaXRzIG9uIGNyZWVwcywgbWF5YmUgcmVkdWNlIGNoYW5jZSBvZiBzcGF3bmluZyBkdXBsaWNhdGUgYm9kaWVzP1xudmFyIHNwYXduQ3JlZXBzID0gKGJvZHlQYXJ0czogQm9keVBhcnRbXVtdKSA9PiB7XG4gICAgaWYgKGJvZHlQYXJ0cy5sZW5ndGggPT0gMCkgcmV0dXJuO1xuICAgIC8vIGZvciBlYWNoIHNwYXduLCBwaWNrIGEgcmFuZG9tIGJvZHksIHRoZW4gYnVpbGQgdGhlIGxhcmdlc3Qgb2YgdGhhdCB0eXBlIGZvciB0aGUgZ2l2ZW4gc3Bhd25cbiAgICBmb3IgKHZhciBzcGF3bk5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5zcGF3bnMpKSB7XG4gICAgICAgIHZhciBzcGF3biA9IEdhbWUuc3Bhd25zW3NwYXduTmFtZV07XG4gICAgICAgIGlmIChzcGF3bi5zcGF3bmluZyAhPSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGJvZHlQYXJ0cy5sZW5ndGgpXG4gICAgICAgIHZhciBib2R5ID0gYm9keVBhcnRzW2lkeF1cbiAgICAgICAgdmFyIGJvZCA9IGdldEJvZHlEZWZpbml0aW9uKGJvZHksIHNwYXduLnJvb20uZW5lcmd5QXZhaWxhYmxlKVxuICAgICAgICBjb25zb2xlLmxvZyhcIldhbnQgdG8gc3Bhd24gXCIsIGJvZClcbiAgICAgICAgdmFyIGVyciA9IHNwYXduLmNyZWF0ZUNyZWVwKGJvZClcbiAgICAgICAgaWYgKGVyciA9PSAwKSB7XG4gICAgICAgICAgICBib2R5UGFydHMuc3BsaWNlKGlkeClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgfVxuICAgIH1cbn1cblxudmFyIGhhc0VuZXJneSA9IChzKSA9PiB7XG4gICAgaWYgKHMuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5hbW91bnQgPiAwO1xuICAgIH1cblxuICAgIGlmIChzLnN0b3JlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5zdG9yZS5lbmVyZ3kgPiAwO1xuICAgIH1cbiAgICBpZiAocy5jYXJyeSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuY2FycnkuZW5lcmd5ID4gMFxuICAgIH1cbiAgICBpZiAocy5lbmVyZ3kgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmVuZXJneSA+IDBcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBSb2xlczogeyBbaW5kZXg6IHN0cmluZ106IEpvYkZ1bmMgfSA9IHtcbiAgICBtZWdhTWluZXI6IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IGNyZWVwLm1lbW9yeS5zSWQ7XG5cbiAgICAgICAgdmFyIHNvdXJjZTtcbiAgICAgICAgaWYgKHNvdXJjZUlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc291cmNlID0gR2FtZS5nZXRPYmplY3RCeUlkKHNvdXJjZUlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc291cmNlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQsIHsgcmV1c2VQYXRoOiAyMCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjcmVlcC5sb2coam9iLnN0YXJ0KVxuICAgICAgICAgICAgc291cmNlID0gam9iLnN0YXJ0LnBvcy5maW5kQ2xvc2VzdEJ5UmFuZ2UoRklORF9TT1VSQ0VTKVxuICAgICAgICAgICAgaWYgKHNvdXJjZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tZW1vcnkuc0lkID0gc291cmNlLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgZXJyID0gY3JlZXAuaGFydmVzdChzb3VyY2UpO1xuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKHNvdXJjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9LFxuXG4gICAgZGVsaXZlcjogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBlcnJcbiAgICAgICAgICAgIHZhciBzdGFydDogU3RydWN0dXJlID0gPFN0cnVjdHVyZT5qb2Iuc3RhcnRcbiAgICAgICAgICAgIGlmICgoc3RhcnQpLnN0cnVjdHVyZVR5cGUgPT0gJ2NvbnRyb2xsZXInICYmIHN0YXJ0Lm93bmVyICYmIHN0YXJ0Lm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJykge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnVwZ3JhZGVDb250cm9sbGVyKDxTdHJ1Y3R1cmU+am9iLnN0YXJ0KVxuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGFydC5jb25zdHJ1Y3RvciA9PSBDb25zdHJ1Y3Rpb25TaXRlKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAuYnVpbGQoPENvbnN0cnVjdGlvblNpdGU+am9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAudHJhbnNmZXJFbmVyZ3koPFN0cnVjdHVyZT5qb2Iuc3RhcnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKGpvYi5zdGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gSk9CX0NPTVBMRVRFO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlcnJcbiAgICB9LFxuXG4gICAgY2Fycnk6IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG5cbiAgICAgICAgaWYgKGpvYi5zdGFydCAhPSB1bmRlZmluZWQgJiYgY3JlZXAuY2FycnkuZW5lcmd5IDwgY3JlZXAuY2FycnlDYXBhY2l0eSAmJiBoYXNFbmVyZ3koam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQsIHsgcmV1c2VQYXRoOiAyMCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBlcnI7XG4gICAgICAgICAgICAgICAgaWYgKCg8RW5lcmd5PmpvYi5zdGFydCkuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5waWNrdXAoPEVuZXJneT5qb2Iuc3RhcnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9ICg8RW5lcmd5SG9sZGVyPmpvYi5zdGFydCkudHJhbnNmZXJFbmVyZ3koY3JlZXApXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPiAwKSB7XG4gICAgICAgICAgICBqb2Iuam9iRnVuYyA9IFJvbGVzWydkZWxpdmVyJ11cbiAgICAgICAgICAgIGpvYi5zdGFydCA9IGpvYi5lbmRcbiAgICAgICAgICAgIGlmIChqb2IuZW5kID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGpvYi5lbmQgPSBmaW5kTmVhcmVzdFN0b3JhZ2UoY3JlZXApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgam9iLmVuZFxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlcnI7XG4gICAgfVxufVxudmFyIFJvbGVzUmV2ZXJzZSA9IHt9XG5mb3IgKHZhciBybiBvZiBPYmplY3Qua2V5cyhSb2xlcykpIHtcbiAgICB2YXIgZm46IGFueSA9IFJvbGVzW3JuXVxuICAgIFJvbGVzUmV2ZXJzZVtmbl0gPSByblxufVxuXG52YXIgQ21wOiB7IFtpbmRleDogc3RyaW5nXTogQ3JlZXBDbXAgfSA9IHtcbiAgICB3b3Jrc0hhcmQ6IChhOiBTY3JlZXAsIGI6IFNjcmVlcCk6IG51bWJlciA9PiB7XG4gICAgICAgIHJldHVybiBiLmhvd01hbnlQYXJ0cyhXT1JLKSAtIGEuaG93TWFueVBhcnRzKFdPUkspXG4gICAgfSxcblxuICAgIGNhcnJpZXNUaGVNb3N0OiAoYTogU2NyZWVwLCBiOiBTY3JlZXApOiBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gKGEuY2FycnlDYXBhY2l0eSAtIGEuY2FycnkuZW5lcmd5KSAtIChiLmNhcnJ5Q2FwYWNpdHkgLSBiLmNhcnJ5LmVuZXJneSlcbiAgICB9LFxuICAgIG5vb3A6IChhOiBTY3JlZXAsIGI6IFNjcmVlcCk6IG51bWJlciA9PiB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuXG4gICAgLy8gY2xvc2VUb1N0YXJ0OiAoYTpDcmVlcCwgYjpDcmVlcCkgOiBudW1iZXIgPT4ge1xuICAgIC8vICAgICByZXR1cm4gYS5wb3MuZ2V0UmFuZ2VUbyhjcmVlcC5qb2Iuc3RhcnQpIC0gYi5wb3MuZ2V0UmFuZ2VUbyhjcmVlcC5qb2Iuc3RhcnQpO1xuICAgIC8vIH1cbn1cbnZhciBDbXBSZXZlcnNlID0ge31cbmZvciAodmFyIHJuIG9mIE9iamVjdC5rZXlzKENtcCkpIHtcbiAgICB2YXIgZm46IGFueSA9IENtcFtybl07XG4gICAgQ21wUmV2ZXJzZVtmbl0gPSBybjtcbn07XG5cblxudmFyIHN0YXRpY0pvYnM6IEpvYltdID0gW25ldyBKb2Ioe1xuICAgIG5hbWU6IFwibWVnYV9taW5lcl8xXCIsXG4gICAgc3RhcnQ6IEdhbWUuZmxhZ3NbJ01pbmVfMV8xJ10sXG4gICAgam9iRnVuYzogUm9sZXNbJ21lZ2FNaW5lciddLFxuICAgIGJvZHlSZXE6IFtXT1JLLCBNT1ZFXSxcbiAgICBjYW5kaWRhdGVDbXA6IENtcFsnd29ya3NIYXJkJ10sXG59KSwgbmV3IEpvYih7XG4gICAgbmFtZTogXCJtZWdhX21pbmVyXzJcIixcbiAgICBzdGFydDogR2FtZS5mbGFnc1snTWluZV8xXzInXSxcbiAgICBqb2JGdW5jOiBSb2xlc1snbWVnYU1pbmVyJ10sXG4gICAgYm9keVJlcTogW1dPUkssIE1PVkVdLFxuICAgIGNhbmRpZGF0ZUNtcDogQ21wWyd3b3Jrc0hhcmQnXSxcbn0pXVxuXG5cblxudmFyIG1lbUpvYnM6IEpvYltdID0gW107XG50cnkge1xuICAgIHZhciBqb2JzSlNPTiA9IE1lbW9yeVtcImpvYnNcIl07XG4gICAgaWYgKGpvYnNKU09OICE9IHVuZGVmaW5lZCkge1xuICAgICAgICBtZW1Kb2JzID0gSlNPTi5wYXJzZShqb2JzSlNPTiwgcGFyc2VKb2IpXG4gICAgfVxufSBjYXRjaCAoZXgpIHtcbiAgICBjb25zb2xlLmxvZyhcIkVycm9yIHBhcnNpbmcgaW4gbWVtb3J5IGpvYnMhOiBcIiArIGV4ICsgXCJcXG4gIFwiICsgTWVtb3J5W1wiam9ic1wiXSlcbiAgICBjb25zb2xlLmxvZyhleC5zdGFjaylcbn1cblxuXG5cblxuLy8gdmFyIHJ1blRvd2VycyA9IChyb29tKSA9PiB7XG4vLyAgICAgcm9vbS5teV9zdHJ1Y3R1cmVzID0gcm9vbS5maW5kKEZJTkRfTVlfU1RSVUNUVVJFUylcblxuLy8gICAgIHJvb20ubXlfY3JlZXBzID0gcm9vbS5maW5kKEZJTkRfTVlfQ1JFRVBTKVxuLy8gICAgIHJvb20uaG9zdGlsZV9jcmVlcHMgPSByb29tLmZpbmQoRklORF9IT1NUSUxFX0NSRUVQUylcblxuLy8gICAgIGVuZXJneSA9IDBcbi8vICAgICBhdHRhY2tlZCA9IGZhbHNlXG4vLyAgICAgZm9yIHRvd2VyIGluIHJvb20ubXlfc3RydWN0dXJlcy5maWx0ZXIoKHMpIC0+cy5zdHJ1Y3R1cmVUeXBlID09ICd0b3dlcicpXG4vLyAgICAgICBwYXRoVXRpbHMgPSBuZXcgUGF0aFV0aWxzKHRvd2VyKVxuXG4vLyAgICAgdHJ5XG4vLyAgICAgICAgIG5lYXJlc3RUYXJnZXQgPSBwYXRoVXRpbHMuc29ydEJ5RGlzdGFuY2Uocm9vbS5ob3N0aWxlX2NyZWVwcy5maWx0ZXIoKGMpIC0+IChjLmJvZHkuZmlsdGVyKChiKSAtPmIudHlwZSA9PSBIRUFMICYmIGIuaGl0cykubGVuZ3RoID4gMCkpKVswXVxuLy8gICAgIG5lYXJlc3RUYXJnZXQgfHw9IHBhdGhVdGlscy5zb3J0QnlEaXN0YW5jZShyb29tLmhvc3RpbGVfY3JlZXBzLmZpbHRlcigoYykgLT4gKGMuYm9keS5maWx0ZXIoKGIpIC0+Yi50eXBlID09IFJBTkdFRF9BVFRBQ0sgJiYgYi5oaXRzKS5sZW5ndGggPiAwKSkpWzBdXG4vLyAgICAgICBjYXRjaCBlXG4vLyAgICAgY29uc29sZS5sb2cgZVxuLy8gICAgIGNvbnNvbGUubG9nIGUuc3RhY2tcbi8vICAgICBuZWFyZXN0VGFyZ2V0IHx8PSBwYXRoVXRpbHMuc29ydEJ5RGlzdGFuY2Uocm9vbS5ob3N0aWxlX2NyZWVwcylbMF1cblxuLy8gICAgIGlmIG5lYXJlc3RUYXJnZXQ/XG4vLyAgICAgICAgIGF0dGFja2VkID0gdHJ1ZVxuLy8gICAgICAgICB0b3dlci5hdHRhY2sobmVhcmVzdFRhcmdldCkgXG5cbi8vICAgICAgIGlmICFhdHRhY2tlZCBhbmQgdG93ZXIuZW5lcmd5ID4gdG93ZXIuZW5lcmd5Q2FwYWNpdHkgKiAwLjc1XG4vLyAgICAgbmVhcmVzdFRhcmdldCA9IHBhdGhVdGlscy5zb3J0QnlEaXN0YW5jZShyb29tLm15X2NyZWVwcy5maWx0ZXIoKGMpIC0+Yy5oaXRzIDwgYy5oaXRzTWF4KSlbMF1cbi8vICAgICB0b3dlci5oZWFsKG5lYXJlc3RUYXJnZXQpIGlmIG5lYXJlc3RUYXJnZXQ/XG5cbi8vICAgICAgICAgbmVhcmVzdFRhcmdldCA9IHBhdGhVdGlscy5zb3J0QnlEaXN0YW5jZShyb29tLm15X3N0cnVjdHVyZXMuZmlsdGVyKFV0aWxzLm5lZWRzUmVwYWlyKSlbMF1cbi8vICAgICAgICAgdW5sZXNzIG5lYXJlc3RUYXJnZXRcbi8vICAgICBuZWFyZXN0VGFyZ2V0ID0gcGF0aFV0aWxzLnNvcnRCeURpc3RhbmNlKHJvb20uZmluZChGSU5EX1NUUlVDVFVSRVMpLmZpbHRlcihVdGlscy5uZWVkc1JlcGFpcikpWzBdXG4vLyAgICAgY29uc29sZS5sb2cgXCJ0b3dlciByZXBhaXJcIiwgbmVhcmVzdFRhcmdldFxuLy8gICAgIHRvd2VyLnJlcGFpcihuZWFyZXN0VGFyZ2V0KSBpZiBuZWFyZXN0VGFyZ2V0PyNhbmQgdG93ZXIucG9zLmdldFJhbmdlVG8obmVhcmVzdFRhcmdldCkgPCA1XG4vLyAgICAgZW5lcmd5ICs9IHRvd2VyLmVuZXJneVxuXG4vLyAgICAgcmV0dXJuIGVuZXJneVxuLy8gfVxuXG5cbnZhciBwcmVKb2JUcyA9IEdhbWUuY3B1LmdldFVzZWQoKVxucnVuQWxsSm9icyhzdGF0aWNKb2JzLCBtZW1Kb2JzKVxudmFyIHBvc3RKb2JUcyA9IEdhbWUuY3B1LmdldFVzZWQoKVxudmFyIHRvUm0gOiBKb2JbXSA9IFtdXG5mb3IgKHZhciBqb2Igb2YgbWVtSm9icykge1xuICAgIGlmIChqb2Iuc3RhcnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRvUm0ucHVzaChqb2IpXG4gICAgfVxufVxuZm9yICh2YXIgam9iIG9mIHRvUm0pIHtcbiAgICB2YXIgaWR4ID0gbWVtSm9icy5pbmRleE9mKGpvYik7XG4gICAgbWVtSm9icy5zcGxpY2UoaWR4LCAxKTtcbn1cblxuXG5NZW1vcnlbXCJqb2JzXCJdID0gSlNPTi5zdHJpbmdpZnkobWVtSm9icylcblxuLy9jb25zb2xlLmxvZyhwb3N0Sm9iVHMgLSBwcmVKb2JUcylcblxuLy8gY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoam9icykpXG4vLyBjb25zb2xlLmxvZyhcblxuLy92YXIgam9iczpKb2JbXSA9IFtdXG5cblxuXG5HYW1lLlJvbGVzID0gUm9sZXNcbnZhciBjbGsgPSBHYW1lLmZsYWdzWydDbG9jayddXG5pZihjbGsgIT0gdW5kZWZpbmVkKSB7XG4gICAgaWYoY2xrLmNvbG9yICE9IENPTE9SX1dISVRFKSB7XG4gICAgICAgIGNsay5zZXRDb2xvcihDT0xPUl9XSElURSlcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGsuc2V0Q29sb3IoQ09MT1JfR1JFWSlcbiAgICB9XG59Il19