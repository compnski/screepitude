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
        namePrefix: 'carry',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createDeliverJob = function (target) {
    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        jobFunc: Roles['deliver'],
        bodyReq: [MOVE, CARRY, CARRY],
        candidateCmp: Cmp['noop'],
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
                        if (jobsForStruct.length < 3) {
                            addJob(createUpgradeJob(struct));
                        }
                    }
                    else {
                        if (jobsForStruct.length < 2) {
                            addJob(createUpgradeJob(struct));
                        }
                    }
                    break;
            }
        }
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
        console.log(job.bodyReq, JSON.stringify(job));
        var candidates = creeps.filter(noJob).filter(getCandidateFilter(job.bodyReq)).sort(job.candidateCmp);
        if (candidates.length > 0) {
            return candidates[0];
        }
        else {
            return null;
        }
    };
    var neededCreeps = [];
    for (var _p = 0; _p < jobs.length; _p++) {
        var job = jobs[_p];
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
    for (var _q = 0; _q < creeps.length; _q++) {
        var creep = creeps[_q];
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
Memory["jobs"] = JSON.stringify(memJobs);
Game.Roles = Roles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9tYWluLnRzIl0sIm5hbWVzIjpbIlN1cGVyQ3JlZXAiLCJTdXBlckNyZWVwLmNvbnN0cnVjdG9yIiwiU3VwZXJDcmVlcC5ob3dNYW55UGFydHMiLCJTdXBlckNyZWVwLmhhc1BhcnQiLCJTdXBlckNyZWVwLmNhbk1vdmUiLCJTdXBlckNyZWVwLmNhbldvcmsiLCJTdXBlckNyZWVwLmNhbkhlYWwiLCJTdXBlckNyZWVwLmNhbkF0dGFjayIsIlN1cGVyQ3JlZXAuY2FuU2hvb3QiLCJTdXBlckNyZWVwLmNhbkNsYWltIiwiU3VwZXJDcmVlcC5sb2ciLCJhcHBseU1peGlucyIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQU9BO0lBQUFBO0lBaURBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtJQUNwQ0EsQ0FBQ0E7SUFFREgsNEJBQU9BLEdBQVBBO1FBQ0lJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVESiw0QkFBT0EsR0FBUEE7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LENBQUNBLEtBQUtBLEdBQUdBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLENBQUFBO1FBQzFCQSxJQUFJQSxDQUFDQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxDQUFBQTtRQUN0QkEsSUFBSUEsQ0FBQ0EsT0FBT0EsR0FBR0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQUE7UUFDOUJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUFBO1FBQzlCQSxJQUFJQSxDQUFDQSxZQUFZQSxHQUFHQSxJQUFJQSxDQUFDQSxjQUFjQSxDQUFDQSxDQUFBQTtRQUN4Q0EsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsT0FBT0EsSUFBSUEsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDNUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLHFCQUFxQkEsR0FBR0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQUE7WUFDOUNBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUNBLENBQUFBO1lBQzVCQSxNQUFNQSxJQUFJQSxLQUFLQSxDQUFDQSxVQUFVQSxHQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFBQTtRQUN6Q0EsQ0FBQ0E7SUFDTEEsQ0FBQ0E7SUFFREQsb0JBQU1BLEdBQU5BO1FBQ0lFLElBQUlBLEtBQUtBLEdBQVFBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBO1FBQzlCQSxJQUFJQSxRQUFRQSxHQUFRQSxJQUFJQSxDQUFDQSxlQUFlQSxDQUFDQTtRQUN6Q0EsSUFBSUEsS0FBS0EsR0FBUUEsSUFBSUEsQ0FBQ0EsWUFBWUEsQ0FBQ0E7UUFDbkNBLElBQUlBLEdBQUdBLEdBQUdBO1lBQ05BLElBQUlBLEVBQUVBLElBQUlBLENBQUNBLElBQUlBO1lBQ2ZBLEtBQUtBLEVBQUVBLElBQUlBLENBQUNBLEtBQUtBLENBQUNBLEVBQUVBO1lBQ3BCQSxPQUFPQSxFQUFFQSxZ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QUNELElBQUksUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QixFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztRQUN4QixPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDNUMsQ0FBQztBQUNMLENBQUU7QUFBQSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsR0FBRyxFQUFFLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzdFLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQ3pCLENBQUM7QUFLRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO0FBQ2pDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDL0IsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUVsQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQVV4QyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuXG5cbmludGVyZmFjZSBTY3JlZXAgZXh0ZW5kcyBDcmVlcCwgU3VwZXJDcmVlcHtcbiAgICBqb2I/IDogSm9iO1xufVxuXG5jbGFzcyBTdXBlckNyZWVwIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZW5lcmd5OiBudW1iZXI7XG4gICAgYm9keToge1xuXG4gICAgICAgIC8qKiBPbmUgb2YgdGhlIGJvZHkgcGFydHMgY29uc3RhbnRzLiAqL1xuICAgICAgICB0eXBlOiBzdHJpbmc7XG5cbiAgICAgICAgLyoqIFRoZSByZW1haW5pbmcgYW1vdW50IG9mIGhpdCBwb2ludHMgb2YgdGhpcyBib2R5IHBhcnQuICovXG4gICAgICAgIGhpdHM6IG51bWJlclxuXG4gICAgfVtdO1xuXG5cbiAgICBob3dNYW55UGFydHMocGFydDpzdHJpbmcpOm51bWJlciB7XG4gICAgICByZXR1cm4gdGhpcy5ib2R5LmZpbHRlcihzID0+IHsgcmV0dXJuIChzLnR5cGUgPT0gcGFydCAmJiBzLmhpdHMgPiAwKSB9KS5sZW5ndGggXG4gICAgfVxuXG4gICAgaGFzUGFydChwYXJ0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICAgIHJldHVybiB0aGlzLmhvd01hbnlQYXJ0cyhwYXJ0KSA+IDBcbiAgICB9XG5cbiAgICBjYW5Nb3ZlKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KE1PVkUpO1xuICAgIH1cblxuICAgIGNhbldvcmsoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoV09SSyk7XG4gICAgfVxuXG4gICAgY2FuSGVhbCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChIRUFMKTtcbiAgICB9XG5cbiAgICBjYW5BdHRhY2soKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoQVRUQUNLKTtcbiAgICB9XG5cbiAgICBjYW5TaG9vdCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChSQU5HRURfQVRUQUNLKTtcbiAgICB9XG5cbiAgICBjYW5DbGFpbSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChDTEFJTSk7XG4gICAgfVxuXG4gICAgbG9nKC4uLm1zZykge1xuICAgICAgICBjb25zb2xlLmxvZyhcIltcIit0aGlzLm5hbWUrXCJdXCIsIC4uLm1zZylcbiAgICB9XG59XG5cblxuXG5cbmZ1bmN0aW9uIGFwcGx5TWl4aW5zKGRlcml2ZWRDdG9yOiBhbnksIGJhc2VDdG9yczogYW55W10pIHtcbiAgICBiYXNlQ3RvcnMuZm9yRWFjaChiYXNlQ3RvciA9PiB7XG4gICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGJhc2VDdG9yLnByb3RvdHlwZSkuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICAgIGRlcml2ZWRDdG9yLnByb3RvdHlwZVtuYW1lXSA9IGJhc2VDdG9yLnByb3RvdHlwZVtuYW1lXTtcbiAgICAgICAgfSlcbiAgICB9KTsgXG59XG5cblxuYXBwbHlNaXhpbnMoQ3JlZXAsIFtTdXBlckNyZWVwXSlcblxuIiwiLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG4vLy8gPHJlZmVyZW5jZSBwYXRoPVwiZ2xvYmFscy50c1wiIC8+XG5cbi8vcmVxdWlyZSgnZ2xvYmFscycpXG5cbi8vIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKFN1cGVyQ3JlZXAucHJvdG90eXBlKS5mb3JFYWNoKG5hbWUgPT4ge1xuLy8gICBDcmVlcC5wcm90b3R5cGVbbmFtZV0gPSBTdXBlckNyZWVwLnByb3RvdHlwZVtuYW1lXVxuLy8gfSlcblxudHlwZSBKb2JGdW5jID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiBudW1iZXI7XG50eXBlIENyZWVwRmlsdGVyID0gKGNyZWVwOiBTY3JlZXApID0+IGJvb2xlYW47XG50eXBlIENyZWVwQ21wID0gKGE6IENyZWVwLCBiOiBTY3JlZXApID0+IG51bWJlcjtcblxuXG5jb25zdCBKT0JfQ09NUExFVEUgPSA5OTlcbmNvbnN0IEVfQ1JBU0ggPSAtOTlcblxuaW50ZXJmYWNlIFBvc2l0aW9uRW50aXR5IHtcbiAgICBwb3M6IFJvb21Qb3NpdGlvblxuICAgIGlkOiBzdHJpbmdcbn1cblxuaW50ZXJmYWNlIEVuZXJneUhvbGRlciBleHRlbmRzIFN0cnVjdHVyZSB7XG4gICAgZW5lcmd5OiBudW1iZXI7XG4gICAgZW5lcmd5Q2FwYWNpdHk6IG51bWJlcjtcbiAgICB0cmFuc2ZlckVuZXJneShjOiBDcmVlcClcbn1cblxuY2xhc3MgSm9iIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgc3RhcnQ6IFBvc2l0aW9uRW50aXR5O1xuICAgIGVuZDogUG9zaXRpb25FbnRpdHk7XG4gICAgam9iRnVuYzogSm9iRnVuYztcbiAgICBjYW5kaWRhdGVGaWx0ZXI6IENyZWVwRmlsdGVyO1xuICAgIGNhbmRpZGF0ZUNtcDogQ3JlZXBDbXA7XG4gICAgY3JlZXA6IFNjcmVlcDsgLy8gU2V0IGR1cmluZyBleGVjdXRpb25nXG4gICAgYm9keVJlcTogQm9keVBhcnRbXVxuXG4gICAgY29uc3RydWN0b3Iob3B0cyA9IHt9KSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG9wdHNbJ25hbWUnXVxuXG4gICAgICAgIHZhciBucCA9IG9wdHNbJ25hbWVQcmVmaXgnXVxuICAgICAgICBpZiAobnAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoTWVtb3J5W1wiam9iQ291bnRzXCJdID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl0gPSB7fTtcbiAgICAgICAgICAgIGlmIChNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdID09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdID0gMDtcbiAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gKz0gMTtcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IG5wICsgXCJfXCIgKyBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zdGFydCA9IG9wdHNbJ3N0YXJ0J11cbiAgICAgICAgdGhpcy5lbmQgPSBvcHRzWydlbmQnXVxuICAgICAgICB0aGlzLmpvYkZ1bmMgPSBvcHRzWydqb2JGdW5jJ11cbiAgICAgICAgdGhpcy5ib2R5UmVxID0gb3B0c1snYm9keVJlcSddXG4gICAgICAgIHRoaXMuY2FuZGlkYXRlQ21wID0gb3B0c1snY2FuZGlkYXRlQ21wJ11cbiAgICAgICAgaWYgKHRoaXMuYm9keVJlcSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQmFkIGpvYiEhLCBubyBib2R5IFwiICsgdGhpcy5uYW1lKVxuICAgICAgICAgICAgY29uc29sZS5sb2cob3B0c1snYm9keVJlcSddKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIGpvYj1cIit0aGlzLm5hbWUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIHZhciBqb2JGbjogYW55ID0gdGhpcy5qb2JGdW5jO1xuICAgICAgICB2YXIgZmlsdGVyRm46IGFueSA9IHRoaXMuY2FuZGlkYXRlRmlsdGVyO1xuICAgICAgICB2YXIgY21wRm46IGFueSA9IHRoaXMuY2FuZGlkYXRlQ21wO1xuICAgICAgICB2YXIgcmV0ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMuc3RhcnQuaWQsXG4gICAgICAgICAgICBqb2JGdW5jOiBSb2xlc1JldmVyc2Vbam9iRm5dLFxuICAgICAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBSZXZlcnNlW2NtcEZuXSxcbiAgICAgICAgICAgIGJvZHlSZXE6IHRoaXMuYm9keVJlcVxuICAgICAgICB9O1xuICAgICAgICBpZiAodGhpcy5lbmQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXRbJ2VuZCddID0gdGhpcy5lbmQuaWQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldFxuICAgIH1cbn1cblxudmFyIHBhcnNlSm9iID0gKGs6IHN0cmluZywgdik6IGFueSA9PiB7XG4gICAgc3dpdGNoIChrKSB7XG4gICAgICAgIGNhc2UgJ3N0YXJ0JzpcbiAgICAgICAgY2FzZSAnZW5kJzpcbiAgICAgICAgICAgIHZhciByID0gR2FtZS5nZXRPYmplY3RCeUlkKHYpXG4gICAgICAgICAgICBpZiAociA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkZBSUxFRCBUTyBMT0FEIFwiICsgayArIFwiIGZyb20gXCIgKyB2KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHI7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnam9iRnVuYyc6XG4gICAgICAgICAgICByZXR1cm4gUm9sZXNbdl07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY2FuZGlkYXRlQ21wJzpcbiAgICAgICAgICAgIHJldHVybiBDbXBbdl07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgICAgIHJldHVybiB2Lm1hcChvPT4geyByZXR1cm4gbmV3IEpvYihvKSB9KVxuICAgIH1cbiAgICByZXR1cm4gdlxufVxuXG52YXIgc2V0Sm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiB7XG4gICAgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXSA9IGNyZWVwLm5hbWU7XG4gICAgam9iLmNyZWVwID0gY3JlZXA7XG4gICAgY3JlZXAuam9iID0gam9iO1xufVxuXG52YXIgY2xlYXJKb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpID0+IHtcbiAgICBkZWxldGUgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICBkZWxldGUgam9iLmNyZWVwXG4gICAgZGVsZXRlIGNyZWVwLmpvYlxufVxuXG52YXIgZ2V0TXlTdHJ1Y3R1cmVzSW5BbGxSb29tcyA9IChzdHJ1Y3RUeXBlczogc3RyaW5nW10pOiBTdHJ1Y3R1cmVbXSA9PiB7XG4gICAgdmFyIHN0cnVjdHMgPSBbXVxuICAgIGZvciAodmFyIHJvb21OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUucm9vbXMpKSB7XG4gICAgICAgIHN0cnVjdHMucHVzaC5hcHBseShnZXRNeVN0cnVjdHVyZXNJblJvb20ocm9vbU5hbWUsIHN0cnVjdFR5cGVzKSlcbiAgICB9XG4gICAgcmV0dXJuIHN0cnVjdHM7XG59XG5cbnZhciBuZWVkc0VuZXJneSA9IChzOiBTdHJ1Y3R1cmUpOiBib29sZWFuID0+IHtcbiAgICBzd2l0Y2ggKHMuc3RydWN0dXJlVHlwZSkge1xuICAgICAgICBjYXNlIFNUUlVDVFVSRV9TVE9SQUdFOlxuICAgICAgICAgICAgcmV0dXJuICg8U3RvcmFnZT5zKS5zdG9yZS5lbmVyZ3kgPCAoPFN0b3JhZ2U+cykuc3RvcmVDYXBhY2l0eTtcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfVE9XRVI6XG4gICAgICAgICAgICByZXR1cm4gKDxUb3dlcj5zKS5lbmVyZ3kgPCAoPFRvd2VyPnMpLmVuZXJneUNhcGFjaXR5ICogLjc1XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OLCBTVFJVQ1RVUkVfTElOSywgU1RSVUNUVVJFX1BPV0VSX1NQQVdOOlxuICAgICAgICAgICAgcmV0dXJuICg8RW5lcmd5SG9sZGVyPnMpLmVuZXJneSA8ICg8RW5lcmd5SG9sZGVyPnMpLmVuZXJneUNhcGFjaXR5XG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxufVxuXG52YXIgZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tID0gKHJvb21OYW1lOiBzdHJpbmcsIHN0cnVjdFR5cGVzOiBzdHJpbmdbXSk6IFN0cnVjdHVyZVtdID0+IHtcbiAgICB2YXIgcm9vbTogUm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdXG4gICAgaWYgKHJvb20gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRPRE86IExvZz9cbiAgICAgICAgY29uc29sZS5sb2coXCJDYW4ndCBmaW5kIHJvb20gXCIgKyByb29tTmFtZSlcbiAgICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICAgIGlmIChyb29tW1wibXlfc3RydWN0dXJlc1wiXSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcm9vbVtcIm15X3N0cnVjdHVyZXNcIl0gPSByb29tLmZpbmQoRklORF9NWV9TVFJVQ1RVUkVTKVxuICAgIH1cbiAgICByZXR1cm4gcm9vbVtcIm15X3N0cnVjdHVyZXNcIl0uZmlsdGVyKHM9PiB7IHJldHVybiBzdHJ1Y3RUeXBlcy5pbmRleE9mKHMuc3RydWN0dXJlVHlwZSkgPiAtMSB9KVxufVxuXG52YXIgZmluZE5lYXJlc3RTdG9yYWdlID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBTdHJ1Y3R1cmUgPT4ge1xuICAgIHZhciBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJblJvb20odGFyZ2V0LnBvcy5yb29tTmFtZSwgW1NUUlVDVFVSRV9TVE9SQUdFXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luUm9vbSh0YXJnZXQucG9zLnJvb21OYW1lLCBbU1RSVUNUVVJFX1RPV0VSXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMoW1NUUlVDVFVSRV9TVE9SQUdFXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMoW1NUUlVDVFVSRV9TUEFXTl0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICByZXR1cm4gdGFyZ2V0LnBvcy5maW5kQ2xvc2VzdEJ5UmFuZ2Uoc3RvcmVzKVxufVxuXG52YXIgY3JlYXRlUGlja3VwSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2NhcnJ5JyxcbiAgICAgICAgc3RhcnQ6IHRhcmdldCxcbiAgICAgICAgZW5kOiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2NhcnJ5J10sXG4gICAgICAgIGJvZHlSZXE6IFtNT1ZFLCBDQVJSWSwgQ0FSUlldLFxuICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFsnY2Fycmllc1RoZU1vc3QnXSxcbiAgICB9KVxufVxuXG52YXIgY3JlYXRlRmlsbEpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICdjYXJyeScsXG4gICAgICAgIHN0YXJ0OiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgZW5kOiB0YXJnZXQsXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydjYXJyeSddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZURlbGl2ZXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAnY2FycnknLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydkZWxpdmVyJ10sXG4gICAgICAgIGJvZHlSZXE6IFtNT1ZFLCBDQVJSWSwgQ0FSUlldLFxuICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFsnbm9vcCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVVcGdyYWRlSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ3VwZ3JhZGUnLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGVuZDogdGFyZ2V0LFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIE1PVkUsIE1PVkUsIFdPUkssIFdPUkssIFdPUkssIFdPUkssIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cblxuLy8gVE9ETzogQVBJIHRvIGFkZCBqb2JzLCBzb21lIHdheSB0byBjb21iaW5lIGluLW1lbW9yeSBqb2JzIHdpdGggaW4tY29kZSBqb2JzXG4vLyBmaXRuZXNzIGZ1bmMgZm9yIGNhbmRpZGF0ZXMgYmFzZWQgb24gZGlzdGFuY2UuXG52YXIgcnVuQWxsSm9icyA9IChzdGF0aWNKb2JzOiBKb2JbXSwgbWVtSm9iczogSm9iW10pID0+IHtcblxuICAgIHZhciBhZGRKb2IgPSAoam9iOiBKb2IpID0+IHtcbiAgICAgICAgbWVtSm9icy5wdXNoKGpvYilcbiAgICB9XG5cbiAgICB2YXIgcmVtb3ZlSm9iID0gKGpvYjogSm9iKSA9PiB7XG4gICAgICAgIHZhciBpZHggPSBtZW1Kb2JzLmluZGV4T2Yoam9iKVxuICAgICAgICBpZiAoaWR4IDwgMCkgcmV0dXJuXG4gICAgICAgIG1lbUpvYnMuc3BsaWNlKGlkeCwgMSlcblxuICAgICAgICBpZHggPSBqb2JzLmluZGV4T2Yoam9iKVxuICAgICAgICBqb2JzLnNwbGljZShpZHgsIDEpXG5cbiAgICB9XG5cbiAgICB2YXIgam9icyA9IHN0YXRpY0pvYnMuY29uY2F0KG1lbUpvYnMpXG5cbiAgICBpZiAoTWVtb3J5Wydqb2Jfd29ya2VycyddID09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlcGxhY2luZyB3b3JrZXIgbWFwMSEhXCIpXG4gICAgICAgIE1lbW9yeVsnam9iX3dvcmtlcnMnXSA9IHt9XG4gICAgfVxuICAgIHZhciBjcmVlcHM6IFNjcmVlcFtdID0gW11cbiAgICBmb3IgKHZhciBuIG9mIE9iamVjdC5rZXlzKEdhbWUuY3JlZXBzKSkge1xuICAgICAgICBpZiAoR2FtZS5jcmVlcHNbbl0uc3Bhd25pbmcpIGNvbnRpbnVlO1xuICAgICAgICBjcmVlcHMucHVzaChHYW1lLmNyZWVwc1tuXSlcbiAgICB9XG5cbiAgICB2YXIgc2VlbkpvYnM6IHsgW2luZGV4OiBzdHJpbmddOiBib29sZWFuIH0gPSB7fVxuXG5cbiAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAvLyBjaGVjayBpZiBzdGlsbCB2YWxpZFxuXG4gICAgICAgIC8vIENoZWNrIGZvciBEdXBlXG4gICAgICAgIGlmIChzZWVuSm9ic1tqb2IubmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRFVQTElDQVRFIEpPQiBJTiBMSVNUISEgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgfVxuICAgICAgICBzZWVuSm9ic1tqb2IubmFtZV0gPSB0cnVlXG5cbiAgICAgICAgdmFyIGNyZWVwTmFtZTogc3RyaW5nID0gTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICAgICAgdmFyIGNyZWVwOiBTY3JlZXAgPSB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnNvbGUubG9nKGpvYi5uYW1lLCBjcmVlcE5hbWUsIGpvYi5zdGFydClcbiAgICAgICAgaWYgKGNyZWVwTmFtZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNyZWVwID0gR2FtZS5jcmVlcHNbY3JlZXBOYW1lXVxuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCA9PSB1bmRlZmluZWQgfHwgam9iLnN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0IGRpc2FwcGVhcmVkIGZvciBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihqb2IpXG4gICAgICAgICAgICAgICAgaWYgKGNyZWVwICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgam9iKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCA9PSB1bmRlZmluZWQgfHwgam9iLnN0YXJ0ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN0YXJ0IGRpc2FwcGVhcmVkIGZvciBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihqb2IpXG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkZWxldGUgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic2V0dGluZyBcIiArIGNyZWVwLm5hbWUgKyBcIiB0byBkbyBcIiArIGpvYi5uYW1lKVxuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSm9iIGNyZWF0b3JzXG5cbiAgICAvLyBHYXRoZXIgZHJvcHBlZCByZXNvdXJjZXNcbiAgICB2YXIgR0FUSEVSX1RIUkVTSE9MRCA9IDIwMCAvLyBUT0RPOiBTZXQgYmFzZWQgb24gYXZhaWxhYmxlIGNyZWVwc1xuICAgIGZvciAodmFyIHJvb21OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUucm9vbXMpKSB7XG4gICAgICAgIHZhciByb29tID0gR2FtZS5yb29tc1tyb29tTmFtZV1cbiAgICAgICAgdmFyIHJlc291cmNlcyA9IHJvb20uZmluZChGSU5EX0RST1BQRURfUkVTT1VSQ0VTKVxuICAgICAgICB2YXIgcmVzb3VyY2VzQnlJZDogeyBbaW5kZXg6IHN0cmluZ106IG51bWJlciB9ID0ge31cbiAgICAgICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGpvYi5uYW1lLCBqb2Iuc3RhcnQpXG4gICAgICAgICAgICBpZiAoKDxSZXNvdXJjZT5qb2Iuc3RhcnQpLnJlc291cmNlVHlwZSA9PSBSRVNPVVJDRV9FTkVSR1kpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhqb2IubmFtZSwgam9iLmNyZWVwKVxuICAgICAgICAgICAgICAgIGlmIChqb2IuY3JlZXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSArPSAoam9iLmNyZWVwLmNhcnJ5Q2FwYWNpdHkgLSBqb2IuY3JlZXAuY2FycnkuZW5lcmd5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHdhbnQgb25lIGVtcHR5IGpvYiBwZXIgcmVzb3VyY2UsIGRlZmF1bHQgdG8gaW5maW5pdHkgaWYgdGhlcmUgYXJlIG5vIGNyZWVwc1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gKz0gOTk5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc291cmNlc0J5SWQpKVxuXG4gICAgICAgIGZvciAodmFyIHJlc291cmNlIG9mIHJlc291cmNlcykge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRseUFsbG9jYXRlZENhcGFjaXR5ID0gcmVzb3VyY2VzQnlJZFtyZXNvdXJjZS5pZF0gfHwgMDtcbiAgICAgICAgICAgIGlmICgocmVzb3VyY2UuYW1vdW50IC0gY3VycmVudGx5QWxsb2NhdGVkQ2FwYWNpdHkpID4gR0FUSEVSX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IHBpY2t1cCBqb2JcIilcbiAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlUGlja3VwSm9iKHJlc291cmNlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUgPSBbU1RSVUNUVVJFX1RPV0VSLCBTVFJVQ1RVUkVfQ09OVFJPTExFUiwgU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OXVxuICAgIHZhciBzdHJ1Y3R1cmVzID0ge31cbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICB2YXIgcm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdO1xuICAgICAgICB2YXIgcm9vbVN0cnVjdHVyZXMgPSByb29tLmZpbmQoRklORF9TVFJVQ1RVUkVTKVxuICAgICAgICBmb3IgKHZhciBzdHJ1Y3RUeXBlIG9mIFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUpIHtcbiAgICAgICAgICAgIHN0cnVjdHVyZXNbc3RydWN0VHlwZV0gPSAoc3RydWN0dXJlc1tzdHJ1Y3RUeXBlXSB8fCBbXSkuY29uY2F0KHJvb21TdHJ1Y3R1cmVzLmZpbHRlcihzPT4geyByZXR1cm4gcy5zdHJ1Y3R1cmVUeXBlID09IHN0cnVjdFR5cGUgfSkpXG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgc3RydWN0VHlwZSBvZiBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFKSB7XG4gICAgICAgIGZvciAodmFyIHN0cnVjdCBvZiBzdHJ1Y3R1cmVzW3N0cnVjdFR5cGVdKSB7XG4gICAgICAgICAgICBpZiAoc3RydWN0Lm93bmVyICYmIHN0cnVjdC5vd25lci51c2VybmFtZSAhPSAnb21nYmVhcicpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIGpvYnNGb3JTdHJ1Y3QgPSBbXVxuICAgICAgICAgICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoam9iLnN0YXJ0ICYmIGpvYi5zdGFydC5pZCA9PSBzdHJ1Y3QuaWQgfHwgKGpvYi5lbmQgJiYgam9iLmVuZC5pZCA9PSBzdHJ1Y3QuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYnNGb3JTdHJ1Y3QucHVzaChqb2IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIG5lZWQgbmV3IGpvYnMgbm93XG4gICAgICAgICAgICBzd2l0Y2ggKHN0cnVjdFR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjpcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTjpcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9FWFRFTlNJT046XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJ1Y3QuZW5lcmd5IDwgc3RydWN0LmVuZXJneUNhcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoam9ic0ZvclN0cnVjdC5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVGaWxsSm9iKHN0cnVjdCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBTVFJVQ1RVUkVfQ09OVFJPTExFUjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdC5sZXZlbCA8IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqb2JzRm9yU3RydWN0Lmxlbmd0aCA8IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlVXBncmFkZUpvYihzdHJ1Y3QpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVVcGdyYWRlSm9iKHN0cnVjdCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgKHJvb20uY29udHJvbGxlciAmJiByb29tLmNvbnRyb2xsZXIub3duZXIgJiYgcm9vbS5jb250cm9sbGVyLm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJylcbiAgICAvLyAgICAgZm9yICh2YXIgc3RydWN0IG9mIHJvb21TdHJ1Y3R1cmVzKSB7XG4gICAgLy8gICAgICAgICAvLyB0b2RvIG9ubHkgcmVwYWlyIHdhbGxzIGluIG15cm9vbXNcbiAgICAvLyAgICAgICAgIGlmIChzdHJ1Y3QuaGl0cyA8IE1hdGgubWluKHN0cnVjdC5oaXRzTWF4LCA1MDAwMCkge1xuICAgIC8vICAgICAgICAgICAgIC8vIGNoZWNrIGl0IGRvZXNudCBleGlzdCwgdGFrZSBpbnRvIGFjb3VudCBhYm92ZSBhcyB3ZWxsXG4gICAgLy8gICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVJlcGFpckpvYihzdHJ1Y3QpKVxuICAgIC8vICAgICAgICAgfVxuICAgIC8vICAgICB9XG4gICAgLy8gfVxuICAgIC8vIHZhciByb29tU2l0ZXMgPSByb29tLmZpbmQoRklORF9NWV9DT05TVFJVQ1RJT05fU0lURVMpXG4gICAgLy8gZm9yICh2YXIgc2l0ZSBvZiByb29tU2l0ZXMpIHtcbiAgICAvLyAgICAgLy8gdG9kbyBvbmx5IHJlcGFpciB3YWxscyBpbiBteXJvb21zXG4gICAgLy8gICAgIC8vIHRyYWNrIGJ1aWxkcmVycyBvbiBhbGwgc2l0ZXMgLS0gbWF5YmUgYSBjb25zdHJ1Y3Rpb24gZm9yZW1hbiBzbyB3ZSBkb250IHNwYXduIHRvbnMgb2Ygam9icyBhbmRcbiAgICAvLyAgICAgaWYgKHN0cnVjdC5oaXRzIDwgTWF0aC5taW4oc3RydWN0LmhpdHNNYXgsIDUwMDAwKSB7XG4gICAgLy8gICAgICAgICBhZGRKb2IoY3JlYXRlUmVwYWlySm9iKHN0cnVjdCkpXG4gICAgLy8gICAgIH1cbiAgICAvLyB9XG5cblxuIFxuXG4gICAgLy8gTWluZSBhbGwgc291cmNlc1xuICAgIC8vIEZpbmQgYWxsIHNvdXJjZXMgaW4gcm9vbXMsIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIGpvYiB0byBtaW5lIGVhY2hcblxuICAgIC8vIEJ1aWxkIHRoaW5nc1xuICAgIC8vIFJlcGFpciB0aGluZ3NcbiAgICAvLyBldGMuXG5cbiAgICAvLyBEZWZlbmQsIGF0dGFjaywgZXRjLlxuXG4gICAgLy8gQWxsb2NhdGUgam9ic1xuXG5cbiAgICB2YXIgbm9Kb2IgPSAoYzogU2NyZWVwKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIHJldHVybiBjLmpvYiA9PSB1bmRlZmluZWQgfHwgYy5qb2IgPT0gbnVsbFxuICAgIH1cblxuICAgIHZhciBnZXRDYW5kaWRhdGVGaWx0ZXIgPSAoYm9keVJlcTogQm9keVBhcnRbXSk6IENyZWVwRmlsdGVyID0+IHtcbiAgICAgICAgdmFyIGJyID0gYm9keVJlcS5zbGljZSgwKVxuICAgICAgICByZXR1cm4gKGNyZWVwOiBDcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgZm9yICh2YXIgbmVlZGVkUGFydCBvZiBicikge1xuICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGZhbHNlXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYm9keVBhcnQgb2YgY3JlZXAuYm9keSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYm9keVBhcnQudHlwZSA9PSBuZWVkZWRQYXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKCFmb3VuZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJvayB0byBhc3NpZ24gXCIgICsgSlNPTi5zdHJpbmdpZnkoY3JlZXAuYm9keSkgKyBcIiB0byBcIisgYm9keVJlcSlcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGZpbmRTdWl0YWJsZUNyZWVwID0gKGpvYjogSm9iKTogU2NyZWVwID0+IHtcbiAgICAgICAgY29uc29sZS5sb2coam9iLmJvZHlSZXEsIEpTT04uc3RyaW5naWZ5KGpvYikpXG4gICAgICAgIHZhciBjYW5kaWRhdGVzOiBTY3JlZXBbXSA9IGNyZWVwcy5maWx0ZXIobm9Kb2IpLmZpbHRlcihnZXRDYW5kaWRhdGVGaWx0ZXIoam9iLmJvZHlSZXEpKS5zb3J0KGpvYi5jYW5kaWRhdGVDbXApXG4gICAgICAgIGlmIChjYW5kaWRhdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjYW5kaWRhdGVzWzBdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdmFyIG5lZWRlZENyZWVwczogQm9keVBhcnRbXVtdID0gW11cbiAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICBpZiAoam9iLmNyZWVwICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy9waWNrIG5ldyBvbmVcbiAgICAgICAgY29uc29sZS5sb2coXCJOZWVkIHRvIHJlcGxhY2UgY3JlZXAgZm9yIGpvYiBcIiArIGpvYi5uYW1lKVxuICAgICAgICAvLyBUT0RPIGZpZ3VyZSBvdXQgY3VycnlpbmcgdG8gcGFzcyBqb2IgaW50byBjbXAgZnVuY3Rpb25cbiAgICAgICAgdmFyIGNyZWVwID0gZmluZFN1aXRhYmxlQ3JlZXAoam9iKVxuICAgICAgICBpZiAoY3JlZXAgIT0gbnVsbCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJQaWNrZWQgY3JlZXAgZm9yIGpvYiBcIiArIGpvYi5uYW1lICsgXCIgZ290IFwiICsgY3JlZXAubmFtZSk7XG4gICAgICAgICAgICBzZXRKb2IoY3JlZXAsIGpvYik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm5vIGNhbmRpZGF0ZXMgZm9yIGpvYj1cIiArIGpvYi5uYW1lICsgXCIgIFwiICsgam9iLmJvZHlSZXEpXG4gICAgICAgICAgICBuZWVkZWRDcmVlcHMucHVzaChqb2IuYm9keVJlcSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBydW5Kb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICB2YXIgcmV0XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXQgPSBjcmVlcC5qb2Iuam9iRnVuYyhjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJDcmFzaCBydW5uaW5nIGpvYiBcIiArIGNyZWVwLmpvYi5uYW1lICsgXCIgYW5kIG1zZyBcIiArIGV4KVxuICAgICAgICAgICAgY29uc29sZS5sb2coZXguc3RhY2spXG4gICAgICAgICAgICByZXQgPSBFX0NSQVNIXG4gICAgICAgIH1cbiAgICAgICAgc3dpdGNoIChyZXQpIHtcbiAgICAgICAgICAgIGNhc2UgSk9CX0NPTVBMRVRFOlxuICAgICAgICAgICAgICAgIGNyZWVwLmxvZyhcIkpvYiBjb21wbGV0ZSFcIilcbiAgICAgICAgICAgICAgICByZW1vdmVKb2IoY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEVfQ1JBU0g6XG4gICAgICAgICAgICBjYXNlIEVSUl9OT1RfRk9VTkQ6XG4gICAgICAgICAgICBjYXNlIEVSUl9JTlZBTElEX1RBUkdFVDpcbiAgICAgICAgICAgIGNhc2UgRVJSX0ZVTEw6XG4gICAgICAgICAgICBjYXNlIEVSUl9JTlZBTElEX0FSR1M6XG4gICAgICAgICAgICBjYXNlIEVSUl9OT1RfT1dORVI6XG4gICAgICAgICAgICAgICAgY3JlZXAubG9nKFwiSm9iIEZhaWxlZCEhIGVycj1cIiArIHJldClcbiAgICAgICAgICAgICAgICByZW1vdmVKb2IoY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldFxuICAgIH1cblxuICAgIGpvYiA9IG51bGxcbiAgICBmb3IgKHZhciBjcmVlcCBvZiBjcmVlcHMpIHtcbiAgICAgICAgaWYgKGNyZWVwLnNwYXduaW5nKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGNyZWVwLmpvYiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNyZWVwLmxvZyhcImpvYj1cIiArIGNyZWVwLmpvYi5uYW1lKVxuICAgICAgICAgICAgaWYgKGNyZWVwLmpvYi5zdGFydCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBDbGVhbnVwXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcnVuSm9iKGNyZWVwLCBqb2IpXG4gICAgICAgIC8vIH0gZWxzZSBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID4gMCkge1xuICAgICAgICAvLyAgICAgdmFyIGogPSBjcmVhdGVEZWxpdmVySm9iKGNyZWVwKVxuICAgICAgICAvLyAgICAgYWRkSm9iKGopXG4gICAgICAgIC8vICAgICBzZXRKb2IoY3JlZXAsIGopXG4gICAgICAgIC8vICAgICBydW5Kb2IoY3JlZXAsIGopXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJOb3RoaW5nIHRvIGRvXCIpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCdWlsZGluZyBiYXNlZCBqb2JzPyFcbiAgICAvLyBuZWVkIHRvIHNwYXduIGEgY3JlZXBcbiAgICBzcGF3bkNyZWVwcyhuZWVkZWRDcmVlcHMpXG59XG5cbnZhciBnZXRCb2R5Q29zdCA9IChib2R5OiBCb2R5UGFydFtdKTogbnVtYmVyID0+IHtcbiAgICB2YXIgY29zdCA9IDBcbiAgICBmb3IgKHZhciBwYXJ0IG9mIGJvZHkpIHtcbiAgICAgICAgY29zdCArPSBCT0RZUEFSVF9DT1NUW3BhcnRdXG4gICAgfVxuICAgIHJldHVybiBjb3N0XG59XG5cbnZhciBnZXRCb2R5RGVmaW5pdGlvbiA9IChib2R5OiBCb2R5UGFydFtdLCBlbmVyZ3lDYXBhY2l0eTogbnVtYmVyKTogQm9keVBhcnRbXSA9PiB7XG4gICAgdmFyIGJvZHlQYXJ0cyA9IFtdXG4gICAgdmFyIGNvc3QgPSBnZXRCb2R5Q29zdChib2R5KVxuICAgIGNvbnNvbGUubG9nKFwiQm9keSBjb3N0cyBcIiArIGNvc3QpXG4gICAgdmFyIGJvZHlDb3VudHMgPSBNYXRoLm1pbihNYXRoLmZsb29yKGVuZXJneUNhcGFjaXR5IC8gY29zdCksIE1hdGguZmxvb3IoNTAgLyBib2R5Lmxlbmd0aCkpXG4gICAgY29uc29sZS5sb2coXCJHb2luZyB0byBidWlsZCB4XCIgKyBib2R5Q291bnRzKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9keUNvdW50czsgaSsrKSB7XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGJvZHlQYXJ0cywgYm9keSlcbiAgICB9XG4gICAgcmV0dXJuIGJvZHlQYXJ0c1xufVxuXG5cbi8vIFRPRE86IFNvbWUgc29ydCBvZiBsaW1pdHMgb24gY3JlZXBzLCBtYXliZSByZWR1Y2UgY2hhbmNlIG9mIHNwYXduaW5nIGR1cGxpY2F0ZSBib2RpZXM/XG52YXIgc3Bhd25DcmVlcHMgPSAoYm9keVBhcnRzOiBCb2R5UGFydFtdW10pID0+IHtcbiAgICBpZiAoYm9keVBhcnRzLmxlbmd0aCA9PSAwKSByZXR1cm47XG4gICAgLy8gZm9yIGVhY2ggc3Bhd24sIHBpY2sgYSByYW5kb20gYm9keSwgdGhlbiBidWlsZCB0aGUgbGFyZ2VzdCBvZiB0aGF0IHR5cGUgZm9yIHRoZSBnaXZlbiBzcGF3blxuICAgIGZvciAodmFyIHNwYXduTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnNwYXducykpIHtcbiAgICAgICAgdmFyIHNwYXduID0gR2FtZS5zcGF3bnNbc3Bhd25OYW1lXTtcbiAgICAgICAgaWYgKHNwYXduLnNwYXduaW5nICE9IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYm9keVBhcnRzLmxlbmd0aClcbiAgICAgICAgdmFyIGJvZHkgPSBib2R5UGFydHNbaWR4XVxuICAgICAgICB2YXIgYm9kID0gZ2V0Qm9keURlZmluaXRpb24oYm9keSwgc3Bhd24ucm9vbS5lbmVyZ3lBdmFpbGFibGUpXG4gICAgICAgIGNvbnNvbGUubG9nKFwiV2FudCB0byBzcGF3biBcIiwgYm9kKVxuICAgICAgICB2YXIgZXJyID0gc3Bhd24uY3JlYXRlQ3JlZXAoYm9kKVxuICAgICAgICBpZiAoZXJyID09IDApIHtcbiAgICAgICAgICAgIGJvZHlQYXJ0cy5zcGxpY2UoaWR4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKVxuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgaGFzRW5lcmd5ID0gKHMpID0+IHtcbiAgICBpZiAocy5hbW91bnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmFtb3VudCA+IDA7XG4gICAgfVxuXG4gICAgaWYgKHMuc3RvcmUgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLnN0b3JlLmVuZXJneSA+IDA7XG4gICAgfVxuICAgIGlmIChzLmNhcnJ5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5jYXJyeS5lbmVyZ3kgPiAwXG4gICAgfVxuICAgIGlmIChzLmVuZXJneSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuZW5lcmd5ID4gMFxuICAgIH1cbiAgICByZXR1cm4gZmFsc2Vcbn1cblxudmFyIFJvbGVzOiB7IFtpbmRleDogc3RyaW5nXTogSm9iRnVuYyB9ID0ge1xuICAgIG1lZ2FNaW5lcjogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgdmFyIHNvdXJjZUlkID0gY3JlZXAubWVtb3J5LnNJZDtcblxuICAgICAgICB2YXIgc291cmNlO1xuICAgICAgICBpZiAoc291cmNlSWQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBzb3VyY2UgPSBHYW1lLmdldE9iamVjdEJ5SWQoc291cmNlSWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNyZWVwLmxvZyhqb2Iuc3RhcnQpXG4gICAgICAgICAgICBzb3VyY2UgPSBqb2Iuc3RhcnQucG9zLmZpbmRDbG9zZXN0QnlSYW5nZShGSU5EX1NPVVJDRVMpXG4gICAgICAgICAgICBpZiAoc291cmNlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1lbW9yeS5zSWQgPSBzb3VyY2UuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNvdXJjZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHZhciBlcnIgPSBjcmVlcC5oYXJ2ZXN0KHNvdXJjZSk7XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyO1xuICAgIH0sXG5cbiAgICBkZWxpdmVyOiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVyclxuICAgICAgICAgICAgdmFyIHN0YXJ0OiBTdHJ1Y3R1cmUgPSA8U3RydWN0dXJlPmpvYi5zdGFydFxuICAgICAgICAgICAgaWYgKChzdGFydCkuc3RydWN0dXJlVHlwZSA9PSAnY29udHJvbGxlcicgJiYgc3RhcnQub3duZXIgJiYgc3RhcnQub3duZXIudXNlcm5hbWUgPT0gJ29tZ2JlYXInKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAudXBncmFkZUNvbnRyb2xsZXIoPFN0cnVjdHVyZT5qb2Iuc3RhcnQpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnRyYW5zZmVyRW5lcmd5KDxTdHJ1Y3R1cmU+am9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlcnIgPT0gRVJSX05PVF9JTl9SQU5HRSkge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIEpPQl9DT01QTEVURTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyXG4gICAgfSxcblxuICAgIGNhcnJ5OiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuXG4gICAgICAgIGlmIChqb2Iuc3RhcnQgIT0gdW5kZWZpbmVkICYmIGNyZWVwLmNhcnJ5LmVuZXJneSA8IGNyZWVwLmNhcnJ5Q2FwYWNpdHkgJiYgaGFzRW5lcmd5KGpvYi5zdGFydCkpIHtcbiAgICAgICAgICAgIGlmICghY3JlZXAucG9zLmlzTmVhclRvKGpvYi5zdGFydCkpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyO1xuICAgICAgICAgICAgICAgIGlmICgoPEVuZXJneT5qb2Iuc3RhcnQpLmFtb3VudCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gY3JlZXAucGlja3VwKDxFbmVyZ3k+am9iLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlcnIgPSAoPEVuZXJneUhvbGRlcj5qb2Iuc3RhcnQpLnRyYW5zZmVyRW5lcmd5KGNyZWVwKVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChlcnIgPT0gRVJSX05PVF9JTl9SQU5HRSkge1xuICAgICAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID4gMCkge1xuICAgICAgICAgICAgam9iLmpvYkZ1bmMgPSBSb2xlc1snZGVsaXZlciddXG4gICAgICAgICAgICBqb2Iuc3RhcnQgPSBqb2IuZW5kXG4gICAgICAgICAgICBpZiAoam9iLmVuZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBqb2IuZW5kID0gZmluZE5lYXJlc3RTdG9yYWdlKGNyZWVwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIGpvYi5lbmRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyO1xuICAgIH1cbn1cbnZhciBSb2xlc1JldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoUm9sZXMpKSB7XG4gICAgdmFyIGZuOiBhbnkgPSBSb2xlc1tybl1cbiAgICBSb2xlc1JldmVyc2VbZm5dID0gcm5cbn1cblxudmFyIENtcDogeyBbaW5kZXg6IHN0cmluZ106IENyZWVwQ21wIH0gPSB7XG4gICAgd29ya3NIYXJkOiAoYTogU2NyZWVwLCBiOiBTY3JlZXApOiBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gYi5ob3dNYW55UGFydHMoV09SSykgLSBhLmhvd01hbnlQYXJ0cyhXT1JLKVxuICAgIH0sXG5cbiAgICBjYXJyaWVzVGhlTW9zdDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIChhLmNhcnJ5Q2FwYWNpdHkgLSBhLmNhcnJ5LmVuZXJneSkgLSAoYi5jYXJyeUNhcGFjaXR5IC0gYi5jYXJyeS5lbmVyZ3kpXG4gICAgfSxcbiAgICBub29wOiAoYTogU2NyZWVwLCBiOiBTY3JlZXApOiBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cblxuICAgIC8vIGNsb3NlVG9TdGFydDogKGE6Q3JlZXAsIGI6Q3JlZXApIDogbnVtYmVyID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIGEucG9zLmdldFJhbmdlVG8oY3JlZXAuam9iLnN0YXJ0KSAtIGIucG9zLmdldFJhbmdlVG8oY3JlZXAuam9iLnN0YXJ0KTtcbiAgICAvLyB9XG59XG52YXIgQ21wUmV2ZXJzZSA9IHt9XG5mb3IgKHZhciBybiBvZiBPYmplY3Qua2V5cyhDbXApKSB7XG4gICAgdmFyIGZuOiBhbnkgPSBDbXBbcm5dO1xuICAgIENtcFJldmVyc2VbZm5dID0gcm47XG59O1xuXG5cbnZhciBzdGF0aWNKb2JzOiBKb2JbXSA9IFtuZXcgSm9iKHtcbiAgICBuYW1lOiBcIm1lZ2FfbWluZXJfMVwiLFxuICAgIHN0YXJ0OiBHYW1lLmZsYWdzWydNaW5lXzFfMSddLFxuICAgIGpvYkZ1bmM6IFJvbGVzWydtZWdhTWluZXInXSxcbiAgICBib2R5UmVxOiBbV09SSywgTU9WRV0sXG4gICAgY2FuZGlkYXRlQ21wOiBDbXBbJ3dvcmtzSGFyZCddLFxufSksIG5ldyBKb2Ioe1xuICAgIG5hbWU6IFwibWVnYV9taW5lcl8yXCIsXG4gICAgc3RhcnQ6IEdhbWUuZmxhZ3NbJ01pbmVfMV8yJ10sXG4gICAgam9iRnVuYzogUm9sZXNbJ21lZ2FNaW5lciddLFxuICAgIGJvZHlSZXE6IFtXT1JLLCBNT1ZFXSxcbiAgICBjYW5kaWRhdGVDbXA6IENtcFsnd29ya3NIYXJkJ10sXG59KV1cblxuXG5cbnZhciBtZW1Kb2JzOiBKb2JbXSA9IFtdO1xudHJ5IHtcbiAgICB2YXIgam9ic0pTT04gPSBNZW1vcnlbXCJqb2JzXCJdO1xuICAgIGlmIChqb2JzSlNPTiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgbWVtSm9icyA9IEpTT04ucGFyc2Uoam9ic0pTT04sIHBhcnNlSm9iKVxuICAgIH1cbn0gY2F0Y2ggKGV4KSB7XG4gICAgY29uc29sZS5sb2coXCJFcnJvciBwYXJzaW5nIGluIG1lbW9yeSBqb2JzITogXCIgKyBleCArIFwiXFxuICBcIiArIE1lbW9yeVtcImpvYnNcIl0pXG4gICAgY29uc29sZS5sb2coZXguc3RhY2spXG59XG5cblxuXG5cbnZhciBwcmVKb2JUcyA9IEdhbWUuY3B1LmdldFVzZWQoKVxucnVuQWxsSm9icyhzdGF0aWNKb2JzLCBtZW1Kb2JzKVxudmFyIHBvc3RKb2JUcyA9IEdhbWUuY3B1LmdldFVzZWQoKVxuXG5NZW1vcnlbXCJqb2JzXCJdID0gSlNPTi5zdHJpbmdpZnkobWVtSm9icylcbi8vY29uc29sZS5sb2cocG9zdEpvYlRzIC0gcHJlSm9iVHMpXG5cbi8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpvYnMpKVxuLy8gY29uc29sZS5sb2coXG5cbi8vdmFyIGpvYnM6Sm9iW10gPSBbXVxuXG5cblxuR2FtZS5Sb2xlcyA9IFJvbGVzIl19