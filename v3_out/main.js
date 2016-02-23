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
        return function (creep) {
            for (var _i = 0; _i < bodyReq.length; _i++) {
                var neededPart = bodyReq[_i];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9tYWluLnRzIl0sIm5hbWVzIjpbIlN1cGVyQ3JlZXAiLCJTdXBlckNyZWVwLmNvbnN0cnVjdG9yIiwiU3VwZXJDcmVlcC5ob3dNYW55UGFydHMiLCJTdXBlckNyZWVwLmhhc1BhcnQiLCJTdXBlckNyZWVwLmNhbk1vdmUiLCJTdXBlckNyZWVwLmNhbldvcmsiLCJTdXBlckNyZWVwLmNhbkhlYWwiLCJTdXBlckNyZWVwLmNhbkF0dGFjayIsIlN1cGVyQ3JlZXAuY2FuU2hvb3QiLCJTdXBlckNyZWVwLmNhbkNsYWltIiwiU3VwZXJDcmVlcC5sb2ciLCJhcHBseU1peGlucyIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQU9BO0lBQUFBO0lBaURBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtJQUNwQ0EsQ0FBQ0E7SUFFREgsNEJBQU9BLEdBQVBBO1FBQ0lJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVESiw0QkFBT0EsR0FBUEE7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R0FBRyxLQUFLLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwic2NyZWVwcy5kLnRzXCIgLz5cblxuXG5pbnRlcmZhY2UgU2NyZWVwIGV4dGVuZHMgQ3JlZXAsIFN1cGVyQ3JlZXB7XG4gICAgam9iPyA6IEpvYjtcbn1cblxuY2xhc3MgU3VwZXJDcmVlcCB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVuZXJneTogbnVtYmVyO1xuICAgIGJvZHk6IHtcblxuICAgICAgICAvKiogT25lIG9mIHRoZSBib2R5IHBhcnRzIGNvbnN0YW50cy4gKi9cbiAgICAgICAgdHlwZTogc3RyaW5nO1xuXG4gICAgICAgIC8qKiBUaGUgcmVtYWluaW5nIGFtb3VudCBvZiBoaXQgcG9pbnRzIG9mIHRoaXMgYm9keSBwYXJ0LiAqL1xuICAgICAgICBoaXRzOiBudW1iZXJcblxuICAgIH1bXTtcblxuXG4gICAgaG93TWFueVBhcnRzKHBhcnQ6c3RyaW5nKTpudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuYm9keS5maWx0ZXIocyA9PiB7IHJldHVybiAocy50eXBlID09IHBhcnQgJiYgcy5oaXRzID4gMCkgfSkubGVuZ3RoIFxuICAgIH1cblxuICAgIGhhc1BhcnQocGFydDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdGhpcy5ob3dNYW55UGFydHMocGFydCkgPiAwXG4gICAgfVxuXG4gICAgY2FuTW92ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChNT1ZFKTtcbiAgICB9XG5cbiAgICBjYW5Xb3JrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KFdPUkspO1xuICAgIH1cblxuICAgIGNhbkhlYWwoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoSEVBTCk7XG4gICAgfVxuXG4gICAgY2FuQXR0YWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KEFUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuU2hvb3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoUkFOR0VEX0FUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuQ2xhaW0oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoQ0xBSU0pO1xuICAgIH1cblxuICAgIGxvZyguLi5tc2cpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJbXCIrdGhpcy5uYW1lK1wiXVwiLCAuLi5tc2cpXG4gICAgfVxufVxuXG5cblxuXG5mdW5jdGlvbiBhcHBseU1peGlucyhkZXJpdmVkQ3RvcjogYW55LCBiYXNlQ3RvcnM6IGFueVtdKSB7XG4gICAgYmFzZUN0b3JzLmZvckVhY2goYmFzZUN0b3IgPT4ge1xuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlQ3Rvci5wcm90b3R5cGUpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgICBkZXJpdmVkQ3Rvci5wcm90b3R5cGVbbmFtZV0gPSBiYXNlQ3Rvci5wcm90b3R5cGVbbmFtZV07XG4gICAgICAgIH0pXG4gICAgfSk7IFxufVxuXG5cbmFwcGx5TWl4aW5zKENyZWVwLCBbU3VwZXJDcmVlcF0pXG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdsb2JhbHMudHNcIiAvPlxuXG4vL3JlcXVpcmUoJ2dsb2JhbHMnKVxuXG4vLyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhTdXBlckNyZWVwLnByb3RvdHlwZSkuZm9yRWFjaChuYW1lID0+IHtcbi8vICAgQ3JlZXAucHJvdG90eXBlW25hbWVdID0gU3VwZXJDcmVlcC5wcm90b3R5cGVbbmFtZV1cbi8vIH0pXG5cbnR5cGUgSm9iRnVuYyA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4gbnVtYmVyO1xudHlwZSBDcmVlcEZpbHRlciA9IChjcmVlcDogU2NyZWVwKSA9PiBib29sZWFuO1xudHlwZSBDcmVlcENtcCA9IChhOiBDcmVlcCwgYjogU2NyZWVwKSA9PiBudW1iZXI7XG5cblxuY29uc3QgSk9CX0NPTVBMRVRFID0gOTk5XG5jb25zdCBFX0NSQVNIID0gLTk5XG5cbmludGVyZmFjZSBQb3NpdGlvbkVudGl0eSB7XG4gICAgcG9zOiBSb29tUG9zaXRpb25cbiAgICBpZDogc3RyaW5nXG59XG5cbmludGVyZmFjZSBFbmVyZ3lIb2xkZXIgZXh0ZW5kcyBTdHJ1Y3R1cmUge1xuICAgIGVuZXJneTogbnVtYmVyO1xuICAgIGVuZXJneUNhcGFjaXR5OiBudW1iZXI7XG4gICAgdHJhbnNmZXJFbmVyZ3koYzogQ3JlZXApXG59XG5cbmNsYXNzIEpvYiB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHN0YXJ0OiBQb3NpdGlvbkVudGl0eTtcbiAgICBlbmQ6IFBvc2l0aW9uRW50aXR5O1xuICAgIGpvYkZ1bmM6IEpvYkZ1bmM7XG4gICAgY2FuZGlkYXRlRmlsdGVyOiBDcmVlcEZpbHRlcjtcbiAgICBjYW5kaWRhdGVDbXA6IENyZWVwQ21wO1xuICAgIGNyZWVwOiBTY3JlZXA7IC8vIFNldCBkdXJpbmcgZXhlY3V0aW9uZ1xuICAgIGJvZHlSZXE6IEJvZHlQYXJ0W11cblxuICAgIGNvbnN0cnVjdG9yKG9wdHMgPSB7fSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBvcHRzWyduYW1lJ11cblxuICAgICAgICB2YXIgbnAgPSBvcHRzWyduYW1lUHJlZml4J11cbiAgICAgICAgaWYgKG5wICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKE1lbW9yeVtcImpvYkNvdW50c1wiXSA9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdID0ge307XG4gICAgICAgICAgICBpZiAoTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSA9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSA9IDA7XG4gICAgICAgICAgICBNZW1vcnlbXCJqb2JDb3VudHNcIl1bbnBdICs9IDE7XG4gICAgICAgICAgICB0aGlzLm5hbWUgPSBucCArIFwiX1wiICsgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3RhcnQgPSBvcHRzWydzdGFydCddXG4gICAgICAgIHRoaXMuZW5kID0gb3B0c1snZW5kJ11cbiAgICAgICAgdGhpcy5qb2JGdW5jID0gb3B0c1snam9iRnVuYyddXG4gICAgICAgIHRoaXMuYm9keVJlcSA9IG9wdHNbJ2JvZHlSZXEnXVxuICAgICAgICB0aGlzLmNhbmRpZGF0ZUNtcCA9IG9wdHNbJ2NhbmRpZGF0ZUNtcCddXG4gICAgfVxuXG4gICAgdG9KU09OKCkge1xuICAgICAgICB2YXIgam9iRm46IGFueSA9IHRoaXMuam9iRnVuYztcbiAgICAgICAgdmFyIGZpbHRlckZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUZpbHRlcjtcbiAgICAgICAgdmFyIGNtcEZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUNtcDtcbiAgICAgICAgdmFyIHJldCA9IHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICAgIHN0YXJ0OiB0aGlzLnN0YXJ0LmlkLFxuICAgICAgICAgICAgam9iRnVuYzogUm9sZXNSZXZlcnNlW2pvYkZuXSxcbiAgICAgICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wUmV2ZXJzZVtjbXBGbl0sXG4gICAgICAgICAgICBib2R5UmVxOiB0aGlzLmJvZHlSZXFcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHRoaXMuZW5kICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0WydlbmQnXSA9IHRoaXMuZW5kLmlkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXRcbiAgICB9XG59XG5cbnZhciBwYXJzZUpvYiA9IChrOiBzdHJpbmcsIHYpOiBhbnkgPT4ge1xuICAgIHN3aXRjaCAoaykge1xuICAgICAgICBjYXNlICdzdGFydCc6XG4gICAgICAgIGNhc2UgJ2VuZCc6XG4gICAgICAgICAgICB2YXIgciA9IEdhbWUuZ2V0T2JqZWN0QnlJZCh2KVxuICAgICAgICAgICAgaWYgKHIgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJGQUlMRUQgVE8gTE9BRCBcIiArIGsgKyBcIiBmcm9tIFwiICsgdilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2pvYkZ1bmMnOlxuICAgICAgICAgICAgcmV0dXJuIFJvbGVzW3ZdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2NhbmRpZGF0ZUNtcCc6XG4gICAgICAgICAgICByZXR1cm4gQ21wW3ZdO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgICAgICByZXR1cm4gdi5tYXAobz0+IHsgcmV0dXJuIG5ldyBKb2IobykgfSlcbiAgICB9XG4gICAgcmV0dXJuIHZcbn1cblxudmFyIHNldEpvYiA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4ge1xuICAgIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV0gPSBjcmVlcC5uYW1lO1xuICAgIGpvYi5jcmVlcCA9IGNyZWVwO1xuICAgIGNyZWVwLmpvYiA9IGpvYjtcbn1cblxudmFyIGNsZWFySm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiB7XG4gICAgZGVsZXRlIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgZGVsZXRlIGpvYi5jcmVlcFxuICAgIGRlbGV0ZSBjcmVlcC5qb2Jcbn1cblxudmFyIGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMgPSAoc3RydWN0VHlwZXM6IHN0cmluZ1tdKTogU3RydWN0dXJlW10gPT4ge1xuICAgIHZhciBzdHJ1Y3RzID0gW11cbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICBzdHJ1Y3RzLnB1c2guYXBwbHkoZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tKHJvb21OYW1lLCBzdHJ1Y3RUeXBlcykpXG4gICAgfVxuICAgIHJldHVybiBzdHJ1Y3RzO1xufVxuXG52YXIgbmVlZHNFbmVyZ3kgPSAoczogU3RydWN0dXJlKTogYm9vbGVhbiA9PiB7XG4gICAgc3dpdGNoIChzLnN0cnVjdHVyZVR5cGUpIHtcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfU1RPUkFHRTpcbiAgICAgICAgICAgIHJldHVybiAoPFN0b3JhZ2U+cykuc3RvcmUuZW5lcmd5IDwgKDxTdG9yYWdlPnMpLnN0b3JlQ2FwYWNpdHk7XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1RPV0VSOlxuICAgICAgICAgICAgcmV0dXJuICg8VG93ZXI+cykuZW5lcmd5IDwgKDxUb3dlcj5zKS5lbmVyZ3lDYXBhY2l0eSAqIC43NVxuICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTiwgU1RSVUNUVVJFX0VYVEVOU0lPTiwgU1RSVUNUVVJFX0xJTkssIFNUUlVDVFVSRV9QT1dFUl9TUEFXTjpcbiAgICAgICAgICAgIHJldHVybiAoPEVuZXJneUhvbGRlcj5zKS5lbmVyZ3kgPCAoPEVuZXJneUhvbGRlcj5zKS5lbmVyZ3lDYXBhY2l0eVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2Vcbn1cblxudmFyIGdldE15U3RydWN0dXJlc0luUm9vbSA9IChyb29tTmFtZTogc3RyaW5nLCBzdHJ1Y3RUeXBlczogc3RyaW5nW10pOiBTdHJ1Y3R1cmVbXSA9PiB7XG4gICAgdmFyIHJvb206IFJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXVxuICAgIGlmIChyb29tID09IHVuZGVmaW5lZCkge1xuICAgICAgICAvLyBUT0RPOiBMb2c/XG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2FuJ3QgZmluZCByb29tIFwiICsgcm9vbU5hbWUpXG4gICAgICAgIHJldHVybiBbXVxuICAgIH1cbiAgICBpZiAocm9vbVtcIm15X3N0cnVjdHVyZXNcIl0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdID0gcm9vbS5maW5kKEZJTkRfTVlfU1RSVUNUVVJFUylcbiAgICB9XG4gICAgcmV0dXJuIHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdLmZpbHRlcihzPT4geyByZXR1cm4gc3RydWN0VHlwZXMuaW5kZXhPZihzLnN0cnVjdHVyZVR5cGUpID4gLTEgfSlcbn1cblxudmFyIGZpbmROZWFyZXN0U3RvcmFnZSA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogU3RydWN0dXJlID0+IHtcbiAgICB2YXIgc3RvcmVzID0gZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tKHRhcmdldC5wb3Mucm9vbU5hbWUsIFtTVFJVQ1RVUkVfU1RPUkFHRV0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJblJvb20odGFyZ2V0LnBvcy5yb29tTmFtZSwgW1NUUlVDVFVSRV9UT1dFUl0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zKFtTVFJVQ1RVUkVfU1RPUkFHRV0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICBpZiAoc3RvcmVzLmxlbmd0aCA9PSAwKVxuICAgICAgICBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zKFtTVFJVQ1RVUkVfU1BBV05dKS5maWx0ZXIobmVlZHNFbmVyZ3kpXG4gICAgcmV0dXJuIHRhcmdldC5wb3MuZmluZENsb3Nlc3RCeVJhbmdlKHN0b3Jlcylcbn1cblxudmFyIGNyZWF0ZVBpY2t1cEpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICdjYXJyeScsXG4gICAgICAgIHN0YXJ0OiB0YXJnZXQsXG4gICAgICAgIGVuZDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydjYXJyeSddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ2NhcnJpZXNUaGVNb3N0J10sXG4gICAgfSlcbn1cblxudmFyIGNyZWF0ZUZpbGxKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAnY2FycnknLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGVuZDogdGFyZ2V0LFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVEZWxpdmVySm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2NhcnJ5JyxcbiAgICAgICAgc3RhcnQ6IGZpbmROZWFyZXN0U3RvcmFnZSh0YXJnZXQpLFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snZGVsaXZlciddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgQ0FSUlksIENBUlJZXSxcbiAgICAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ25vb3AnXSxcbiAgICB9KVxufVxuXG52YXIgY3JlYXRlVXBncmFkZUpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICd1cGdyYWRlJyxcbiAgICAgICAgc3RhcnQ6IGZpbmROZWFyZXN0U3RvcmFnZSh0YXJnZXQpLFxuICAgICAgICBlbmQ6IHRhcmdldCxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2NhcnJ5J10sXG4gICAgICAgIGJvZHlSZXE6IFtNT1ZFLCBNT1ZFLCBNT1ZFLCBXT1JLLCBXT1JLLCBXT1JLLCBXT1JLLCBDQVJSWSwgQ0FSUlldLFxuICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFsnY2Fycmllc1RoZU1vc3QnXSxcbiAgICB9KVxufVxuXG5cbi8vIFRPRE86IEFQSSB0byBhZGQgam9icywgc29tZSB3YXkgdG8gY29tYmluZSBpbi1tZW1vcnkgam9icyB3aXRoIGluLWNvZGUgam9ic1xuLy8gZml0bmVzcyBmdW5jIGZvciBjYW5kaWRhdGVzIGJhc2VkIG9uIGRpc3RhbmNlLlxudmFyIHJ1bkFsbEpvYnMgPSAoc3RhdGljSm9iczogSm9iW10sIG1lbUpvYnM6IEpvYltdKSA9PiB7XG5cbiAgICB2YXIgYWRkSm9iID0gKGpvYjogSm9iKSA9PiB7XG4gICAgICAgIG1lbUpvYnMucHVzaChqb2IpXG4gICAgfVxuXG4gICAgdmFyIHJlbW92ZUpvYiA9IChqb2I6IEpvYikgPT4ge1xuICAgICAgICB2YXIgaWR4ID0gbWVtSm9icy5pbmRleE9mKGpvYilcbiAgICAgICAgaWYgKGlkeCA8IDApIHJldHVyblxuICAgICAgICBtZW1Kb2JzLnNwbGljZShpZHgsIDEpXG5cbiAgICAgICAgaWR4ID0gam9icy5pbmRleE9mKGpvYilcbiAgICAgICAgam9icy5zcGxpY2UoaWR4LCAxKVxuXG4gICAgfVxuXG4gICAgdmFyIGpvYnMgPSBzdGF0aWNKb2JzLmNvbmNhdChtZW1Kb2JzKVxuXG4gICAgaWYgKE1lbW9yeVsnam9iX3dvcmtlcnMnXSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZXBsYWNpbmcgd29ya2VyIG1hcDEhIVwiKVxuICAgICAgICBNZW1vcnlbJ2pvYl93b3JrZXJzJ10gPSB7fVxuICAgIH1cbiAgICB2YXIgY3JlZXBzOiBTY3JlZXBbXSA9IFtdXG4gICAgZm9yICh2YXIgbiBvZiBPYmplY3Qua2V5cyhHYW1lLmNyZWVwcykpIHtcbiAgICAgICAgaWYgKEdhbWUuY3JlZXBzW25dLnNwYXduaW5nKSBjb250aW51ZTtcbiAgICAgICAgY3JlZXBzLnB1c2goR2FtZS5jcmVlcHNbbl0pXG4gICAgfVxuXG4gICAgdmFyIHNlZW5Kb2JzOiB7IFtpbmRleDogc3RyaW5nXTogYm9vbGVhbiB9ID0ge31cblxuXG4gICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgLy8gY2hlY2sgaWYgc3RpbGwgdmFsaWRcblxuICAgICAgICAvLyBDaGVjayBmb3IgRHVwZVxuICAgICAgICBpZiAoc2VlbkpvYnNbam9iLm5hbWVdKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRVUExJQ0FURSBKT0IgSU4gTElTVCEhIFwiICsgam9iLm5hbWUpXG4gICAgICAgIH1cbiAgICAgICAgc2VlbkpvYnNbam9iLm5hbWVdID0gdHJ1ZVxuXG4gICAgICAgIHZhciBjcmVlcE5hbWU6IHN0cmluZyA9IE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgICAgIHZhciBjcmVlcDogU2NyZWVwID0gdW5kZWZpbmVkO1xuICAgICAgICBjb25zb2xlLmxvZyhqb2IubmFtZSwgY3JlZXBOYW1lLCBqb2Iuc3RhcnQpXG4gICAgICAgIGlmIChjcmVlcE5hbWUgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjcmVlcCA9IEdhbWUuY3JlZXBzW2NyZWVwTmFtZV1cbiAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgPT0gdW5kZWZpbmVkIHx8IGpvYi5zdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdGFydCBkaXNhcHBlYXJlZCBmb3IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgICAgICByZW1vdmVKb2Ioam9iKVxuICAgICAgICAgICAgICAgIGlmIChjcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGpvYilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgPT0gdW5kZWZpbmVkIHx8IGpvYi5zdGFydCA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdGFydCBkaXNhcHBlYXJlZCBmb3IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgICAgICByZW1vdmVKb2Ioam9iKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNyZWVwID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZGVsZXRlIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcInNldHRpbmcgXCIgKyBjcmVlcC5uYW1lICsgXCIgdG8gZG8gXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgIHNldEpvYihjcmVlcCwgam9iKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEpvYiBjcmVhdG9yc1xuXG4gICAgLy8gR2F0aGVyIGRyb3BwZWQgcmVzb3VyY2VzXG4gICAgdmFyIEdBVEhFUl9USFJFU0hPTEQgPSAyMDAgLy8gVE9ETzogU2V0IGJhc2VkIG9uIGF2YWlsYWJsZSBjcmVlcHNcbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICB2YXIgcm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdXG4gICAgICAgIHZhciByZXNvdXJjZXMgPSByb29tLmZpbmQoRklORF9EUk9QUEVEX1JFU09VUkNFUylcbiAgICAgICAgdmFyIHJlc291cmNlc0J5SWQ6IHsgW2luZGV4OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9XG4gICAgICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKGpvYi5uYW1lLCBqb2Iuc3RhcnQpXG4gICAgICAgICAgICBpZiAoKDxSZXNvdXJjZT5qb2Iuc3RhcnQpLnJlc291cmNlVHlwZSA9PSBSRVNPVVJDRV9FTkVSR1kpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhqb2IubmFtZSwgam9iLmNyZWVwKVxuICAgICAgICAgICAgICAgIGlmIChqb2IuY3JlZXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSArPSAoam9iLmNyZWVwLmNhcnJ5Q2FwYWNpdHkgLSBqb2IuY3JlZXAuY2FycnkuZW5lcmd5KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHdhbnQgb25lIGVtcHR5IGpvYiBwZXIgcmVzb3VyY2UsIGRlZmF1bHQgdG8gaW5maW5pdHkgaWYgdGhlcmUgYXJlIG5vIGNyZWVwc1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gKz0gOTk5XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KHJlc291cmNlc0J5SWQpKVxuXG4gICAgICAgIGZvciAodmFyIHJlc291cmNlIG9mIHJlc291cmNlcykge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRseUFsbG9jYXRlZENhcGFjaXR5ID0gcmVzb3VyY2VzQnlJZFtyZXNvdXJjZS5pZF0gfHwgMDtcbiAgICAgICAgICAgIGlmICgocmVzb3VyY2UuYW1vdW50IC0gY3VycmVudGx5QWxsb2NhdGVkQ2FwYWNpdHkpID4gR0FUSEVSX1RIUkVTSE9MRCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiTmV3IHBpY2t1cCBqb2JcIilcbiAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlUGlja3VwSm9iKHJlc291cmNlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUgPSBbU1RSVUNUVVJFX1RPV0VSLCBTVFJVQ1RVUkVfQ09OVFJPTExFUiwgU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OXVxuICAgIHZhciBzdHJ1Y3R1cmVzID0ge31cbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICB2YXIgcm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdO1xuICAgICAgICB2YXIgcm9vbVN0cnVjdHVyZXMgPSByb29tLmZpbmQoRklORF9TVFJVQ1RVUkVTKVxuICAgICAgICBmb3IgKHZhciBzdHJ1Y3RUeXBlIG9mIFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUpIHtcbiAgICAgICAgICAgIHN0cnVjdHVyZXNbc3RydWN0VHlwZV0gPSAoc3RydWN0dXJlc1tzdHJ1Y3RUeXBlXSB8fCBbXSkuY29uY2F0KHJvb21TdHJ1Y3R1cmVzLmZpbHRlcihzPT4geyByZXR1cm4gcy5zdHJ1Y3R1cmVUeXBlID09IHN0cnVjdFR5cGUgfSkpXG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICh2YXIgc3RydWN0VHlwZSBvZiBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFKSB7XG4gICAgICAgIGZvciAodmFyIHN0cnVjdCBvZiBzdHJ1Y3R1cmVzW3N0cnVjdFR5cGVdKSB7XG4gICAgICAgICAgICB2YXIgam9ic0ZvclN0cnVjdCA9IFtdXG4gICAgICAgICAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgJiYgam9iLnN0YXJ0LmlkID09IHN0cnVjdC5pZCB8fCAoam9iLmVuZCAmJiBqb2IuZW5kLmlkID09IHN0cnVjdC5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgam9ic0ZvclN0cnVjdC5wdXNoKGpvYilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCBuZXcgam9icyBub3dcbiAgICAgICAgICAgIHN3aXRjaCAoc3RydWN0VHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX1RPV0VSOlxuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOOlxuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX0VYVEVOU0lPTjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdC5lbmVyZ3kgPCBzdHJ1Y3QuZW5lcmd5Q2FwYWNpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqb2JzRm9yU3RydWN0Lmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZUZpbGxKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9DT05UUk9MTEVSOlxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RydWN0LmxldmVsIDwgNSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVVcGdyYWRlSm9iKHN0cnVjdCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoam9ic0ZvclN0cnVjdC5sZW5ndGggPCAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVVwZ3JhZGVKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1pbmUgYWxsIHNvdXJjZXNcbiAgICAvLyBGaW5kIGFsbCBzb3VyY2VzIGluIHJvb21zLCBtYWtlIHN1cmUgdGhlcmUgaXMgYSBqb2IgdG8gbWluZSBlYWNoXG5cbiAgICAvLyBCdWlsZCB0aGluZ3NcbiAgICAvLyBSZXBhaXIgdGhpbmdzXG4gICAgLy8gZXRjLlxuXG4gICAgLy8gRGVmZW5kLCBhdHRhY2ssIGV0Yy5cblxuXG4gICAgLy8gRXZlbnR1YWxseSBoYXZlIHBhcnQgdGhhdCBidWlsZHMgY3JlZXBzXG5cblxuXG5cbiAgICAvLyBBbGxvY2F0ZSBqb2JzXG5cblxuICAgIHZhciBub0pvYiA9IChjOiBTY3JlZXApOiBib29sZWFuID0+IHtcbiAgICAgICAgcmV0dXJuIGMuam9iID09IHVuZGVmaW5lZCB8fCBjLmpvYiA9PSBudWxsXG4gICAgfVxuXG4gICAgdmFyIGdldENhbmRpZGF0ZUZpbHRlciA9IChib2R5UmVxOiBCb2R5UGFydFtdKTogQ3JlZXBGaWx0ZXIgPT4ge1xuICAgICAgICByZXR1cm4gKGNyZWVwOiBDcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICAgICAgZm9yICh2YXIgbmVlZGVkUGFydCBvZiBib2R5UmVxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBib2R5UGFydCBvZiBjcmVlcC5ib2R5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib2R5UGFydC50eXBlID09IG5lZWRlZFBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9rIHRvIGFzc2lnbiBcIiAgKyBKU09OLnN0cmluZ2lmeShjcmVlcC5ib2R5KSArIFwiIHRvIFwiKyBib2R5UmVxKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZmluZFN1aXRhYmxlQ3JlZXAgPSAoam9iOiBKb2IpOiBTY3JlZXAgPT4ge1xuICAgICAgICB2YXIgY2FuZGlkYXRlczogU2NyZWVwW10gPSBjcmVlcHMuZmlsdGVyKG5vSm9iKS5maWx0ZXIoZ2V0Q2FuZGlkYXRlRmlsdGVyKGpvYi5ib2R5UmVxKSkuc29ydChqb2IuY2FuZGlkYXRlQ21wKVxuICAgICAgICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBuZWVkZWRDcmVlcHM6IEJvZHlQYXJ0W11bXSA9IFtdXG4gICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgaWYgKGpvYi5jcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vcGljayBuZXcgb25lXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmVlZCB0byByZXBsYWNlIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgLy8gVE9ETyBmaWd1cmUgb3V0IGN1cnJ5aW5nIHRvIHBhc3Mgam9iIGludG8gY21wIGZ1bmN0aW9uXG4gICAgICAgIHZhciBjcmVlcCA9IGZpbmRTdWl0YWJsZUNyZWVwKGpvYilcbiAgICAgICAgaWYgKGNyZWVwICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGlja2VkIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSArIFwiIGdvdCBcIiArIGNyZWVwLm5hbWUpO1xuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBjYW5kaWRhdGVzIGZvciBqb2I9XCIgKyBqb2IubmFtZSArIFwiICBcIiArIGpvYi5ib2R5UmVxKVxuICAgICAgICAgICAgbmVlZGVkQ3JlZXBzLnB1c2goam9iLmJvZHlSZXEpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcnVuSm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgdmFyIHJldFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0ID0gY3JlZXAuam9iLmpvYkZ1bmMoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3Jhc2ggcnVubmluZyBqb2IgXCIgKyBjcmVlcC5qb2IubmFtZSArIFwiIGFuZCBtc2cgXCIgKyBleClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxuICAgICAgICAgICAgcmV0ID0gRV9DUkFTSFxuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAocmV0KSB7XG4gICAgICAgICAgICBjYXNlIEpPQl9DT01QTEVURTpcbiAgICAgICAgICAgICAgICBjcmVlcC5sb2coXCJKb2IgY29tcGxldGUhXCIpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBFX0NSQVNIOlxuICAgICAgICAgICAgY2FzZSBFUlJfTk9UX0ZPVU5EOlxuICAgICAgICAgICAgY2FzZSBFUlJfSU5WQUxJRF9UQVJHRVQ6XG4gICAgICAgICAgICBjYXNlIEVSUl9GVUxMOlxuICAgICAgICAgICAgY2FzZSBFUlJfSU5WQUxJRF9BUkdTOlxuICAgICAgICAgICAgY2FzZSBFUlJfTk9UX09XTkVSOlxuICAgICAgICAgICAgICAgIGNyZWVwLmxvZyhcIkpvYiBGYWlsZWQhISBlcnI9XCIgKyByZXQpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXRcbiAgICB9XG5cbiAgICBqb2IgPSBudWxsXG4gICAgZm9yICh2YXIgY3JlZXAgb2YgY3JlZXBzKSB7XG4gICAgICAgIGlmIChjcmVlcC5zcGF3bmluZykgY29udGludWU7XG4gICAgICAgIGlmIChjcmVlcC5qb2IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJqb2I9XCIgKyBjcmVlcC5qb2IubmFtZSlcbiAgICAgICAgICAgIGlmIChjcmVlcC5qb2Iuc3RhcnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogQ2xlYW51cFxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1bkpvYihjcmVlcCwgam9iKVxuICAgICAgICAvLyB9IGVsc2UgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA+IDApIHtcbiAgICAgICAgLy8gICAgIHZhciBqID0gY3JlYXRlRGVsaXZlckpvYihjcmVlcClcbiAgICAgICAgLy8gICAgIGFkZEpvYihqKVxuICAgICAgICAvLyAgICAgc2V0Sm9iKGNyZWVwLCBqKVxuICAgICAgICAvLyAgICAgcnVuSm9iKGNyZWVwLCBqKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3JlZXAubG9nKFwiTm90aGluZyB0byBkb1wiKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gQnVpbGRpbmcgYmFzZWQgam9icz8hXG4gICAgLy8gbmVlZCB0byBzcGF3biBhIGNyZWVwXG4gICAgc3Bhd25DcmVlcHMobmVlZGVkQ3JlZXBzKVxufVxuXG52YXIgZ2V0Qm9keUNvc3QgPSAoYm9keTogQm9keVBhcnRbXSk6IG51bWJlciA9PiB7XG4gICAgdmFyIGNvc3QgPSAwXG4gICAgZm9yICh2YXIgcGFydCBvZiBib2R5KSB7XG4gICAgICAgIGNvc3QgKz0gQk9EWVBBUlRfQ09TVFtwYXJ0XVxuICAgIH1cbiAgICByZXR1cm4gY29zdFxufVxuXG52YXIgZ2V0Qm9keURlZmluaXRpb24gPSAoYm9keTogQm9keVBhcnRbXSwgZW5lcmd5Q2FwYWNpdHk6IG51bWJlcik6IEJvZHlQYXJ0W10gPT4ge1xuICAgIHZhciBib2R5UGFydHMgPSBbXVxuICAgIHZhciBjb3N0ID0gZ2V0Qm9keUNvc3QoYm9keSlcbiAgICBjb25zb2xlLmxvZyhcIkJvZHkgY29zdHMgXCIgKyBjb3N0KVxuICAgIHZhciBib2R5Q291bnRzID0gTWF0aC5taW4oTWF0aC5mbG9vcihlbmVyZ3lDYXBhY2l0eSAvIGNvc3QpLCBNYXRoLmZsb29yKDUwIC8gYm9keS5sZW5ndGgpKVxuICAgIGNvbnNvbGUubG9nKFwiR29pbmcgdG8gYnVpbGQgeFwiICsgYm9keUNvdW50cylcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJvZHlDb3VudHM7IGkrKykge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShib2R5UGFydHMsIGJvZHkpXG4gICAgfVxuICAgIHJldHVybiBib2R5UGFydHNcbn1cblxudmFyIHNwYXduQ3JlZXBzID0gKGJvZHlQYXJ0czogQm9keVBhcnRbXVtdKSA9PiB7XG4gICAgaWYgKGJvZHlQYXJ0cy5sZW5ndGggPT0gMCkgcmV0dXJuO1xuICAgIC8vIGZvciBlYWNoIHNwYXduLCBwaWNrIGEgcmFuZG9tIGJvZHksIHRoZW4gYnVpbGQgdGhlIGxhcmdlc3Qgb2YgdGhhdCB0eXBlIGZvciB0aGUgZ2l2ZW4gc3Bhd25cbiAgICBmb3IgKHZhciBzcGF3bk5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5zcGF3bnMpKSB7XG4gICAgICAgIHZhciBzcGF3biA9IEdhbWUuc3Bhd25zW3NwYXduTmFtZV07XG4gICAgICAgIGlmIChzcGF3bi5zcGF3bmluZyAhPSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgdmFyIGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGJvZHlQYXJ0cy5sZW5ndGgpXG4gICAgICAgIHZhciBib2R5ID0gYm9keVBhcnRzW2lkeF1cbiAgICAgICAgdmFyIGJvZCA9IGdldEJvZHlEZWZpbml0aW9uKGJvZHksIHNwYXduLnJvb20uZW5lcmd5QXZhaWxhYmxlKVxuICAgICAgICBjb25zb2xlLmxvZyhcIldhbnQgdG8gc3Bhd24gXCIsIGJvZClcbiAgICAgICAgdmFyIGVyciA9IHNwYXduLmNyZWF0ZUNyZWVwKGJvZClcbiAgICAgICAgaWYgKGVyciA9PSAwKSB7XG4gICAgICAgICAgICBib2R5UGFydHMuc3BsaWNlKGlkeClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGVycilcbiAgICAgICAgfVxuICAgIH1cbn1cblxudmFyIGhhc0VuZXJneSA9IChzKSA9PiB7XG4gICAgaWYgKHMuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5hbW91bnQgPiAwO1xuICAgIH1cblxuICAgIGlmIChzLnN0b3JlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5zdG9yZS5lbmVyZ3kgPiAwO1xuICAgIH1cbiAgICBpZiAocy5jYXJyeSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuY2FycnkuZW5lcmd5ID4gMFxuICAgIH1cbiAgICBpZiAocy5lbmVyZ3kgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmVuZXJneSA+IDBcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBSb2xlczogeyBbaW5kZXg6IHN0cmluZ106IEpvYkZ1bmMgfSA9IHtcbiAgICBtZWdhTWluZXI6IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IGNyZWVwLm1lbW9yeS5zSWQ7XG5cbiAgICAgICAgdmFyIHNvdXJjZTtcbiAgICAgICAgaWYgKHNvdXJjZUlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc291cmNlID0gR2FtZS5nZXRPYmplY3RCeUlkKHNvdXJjZUlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc291cmNlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQsIHsgcmV1c2VQYXRoOiAyMCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjcmVlcC5sb2coam9iLnN0YXJ0KVxuICAgICAgICAgICAgc291cmNlID0gam9iLnN0YXJ0LnBvcy5maW5kQ2xvc2VzdEJ5UmFuZ2UoRklORF9TT1VSQ0VTKVxuICAgICAgICAgICAgaWYgKHNvdXJjZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tZW1vcnkuc0lkID0gc291cmNlLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgZXJyID0gY3JlZXAuaGFydmVzdChzb3VyY2UpO1xuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKHNvdXJjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9LFxuXG4gICAgZGVsaXZlcjogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBlcnJcbiAgICAgICAgICAgIHZhciBzdGFydDogU3RydWN0dXJlID0gPFN0cnVjdHVyZT5qb2Iuc3RhcnRcbiAgICAgICAgICAgIGlmICgoc3RhcnQpLnN0cnVjdHVyZVR5cGUgPT0gJ2NvbnRyb2xsZXInICYmIHN0YXJ0Lm93bmVyICYmIHN0YXJ0Lm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJykge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnVwZ3JhZGVDb250cm9sbGVyKDxTdHJ1Y3R1cmU+am9iLnN0YXJ0KVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC50cmFuc2ZlckVuZXJneSg8U3RydWN0dXJlPmpvYi5zdGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBKT0JfQ09NUExFVEU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVyclxuICAgIH0sXG5cbiAgICBjYXJyeTogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcblxuICAgICAgICBpZiAoam9iLnN0YXJ0ICE9IHVuZGVmaW5lZCAmJiBjcmVlcC5jYXJyeS5lbmVyZ3kgPCBjcmVlcC5jYXJyeUNhcGFjaXR5ICYmIGhhc0VuZXJneShqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycjtcbiAgICAgICAgICAgICAgICBpZiAoKDxFbmVyZ3k+am9iLnN0YXJ0KS5hbW91bnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnBpY2t1cCg8RW5lcmd5PmpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gKDxFbmVyZ3lIb2xkZXI+am9iLnN0YXJ0KS50cmFuc2ZlckVuZXJneShjcmVlcClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKGpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA+IDApIHtcbiAgICAgICAgICAgIGpvYi5qb2JGdW5jID0gUm9sZXNbJ2RlbGl2ZXInXVxuICAgICAgICAgICAgam9iLnN0YXJ0ID0gam9iLmVuZFxuICAgICAgICAgICAgaWYgKGpvYi5lbmQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgam9iLmVuZCA9IGZpbmROZWFyZXN0U3RvcmFnZShjcmVlcClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBqb2IuZW5kXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9XG59XG52YXIgUm9sZXNSZXZlcnNlID0ge31cbmZvciAodmFyIHJuIG9mIE9iamVjdC5rZXlzKFJvbGVzKSkge1xuICAgIHZhciBmbjogYW55ID0gUm9sZXNbcm5dXG4gICAgUm9sZXNSZXZlcnNlW2ZuXSA9IHJuXG59XG5cbnZhciBDbXA6IHsgW2luZGV4OiBzdHJpbmddOiBDcmVlcENtcCB9ID0ge1xuICAgIHdvcmtzSGFyZDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIGIuaG93TWFueVBhcnRzKFdPUkspIC0gYS5ob3dNYW55UGFydHMoV09SSylcbiAgICB9LFxuXG4gICAgY2Fycmllc1RoZU1vc3Q6IChhOiBTY3JlZXAsIGI6IFNjcmVlcCk6IG51bWJlciA9PiB7XG4gICAgICAgIHJldHVybiAoYS5jYXJyeUNhcGFjaXR5IC0gYS5jYXJyeS5lbmVyZ3kpIC0gKGIuY2FycnlDYXBhY2l0eSAtIGIuY2FycnkuZW5lcmd5KVxuICAgIH0sXG4gICAgbm9vcDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG5cbiAgICAvLyBjbG9zZVRvU3RhcnQ6IChhOkNyZWVwLCBiOkNyZWVwKSA6IG51bWJlciA9PiB7XG4gICAgLy8gICAgIHJldHVybiBhLnBvcy5nZXRSYW5nZVRvKGNyZWVwLmpvYi5zdGFydCkgLSBiLnBvcy5nZXRSYW5nZVRvKGNyZWVwLmpvYi5zdGFydCk7XG4gICAgLy8gfVxufVxudmFyIENtcFJldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoQ21wKSkge1xuICAgIHZhciBmbjogYW55ID0gQ21wW3JuXTtcbiAgICBDbXBSZXZlcnNlW2ZuXSA9IHJuO1xufTtcblxuXG52YXIgc3RhdGljSm9iczogSm9iW10gPSBbbmV3IEpvYih7XG4gICAgbmFtZTogXCJtZWdhX21pbmVyXzFcIixcbiAgICBzdGFydDogR2FtZS5mbGFnc1snTWluZV8xXzEnXSxcbiAgICBqb2JGdW5jOiBSb2xlc1snbWVnYU1pbmVyJ10sXG4gICAgYm9keVJlcTogW1dPUkssIE1PVkVdLFxuICAgIGNhbmRpZGF0ZUNtcDogQ21wWyd3b3Jrc0hhcmQnXSxcbn0pLCBuZXcgSm9iKHtcbiAgICBuYW1lOiBcIm1lZ2FfbWluZXJfMlwiLFxuICAgIHN0YXJ0OiBHYW1lLmZsYWdzWydNaW5lXzFfMiddLFxuICAgIGpvYkZ1bmM6IFJvbGVzWydtZWdhTWluZXInXSxcbiAgICBib2R5UmVxOiBbV09SSywgTU9WRV0sXG4gICAgY2FuZGlkYXRlQ21wOiBDbXBbJ3dvcmtzSGFyZCddLFxufSldXG5cblxuXG52YXIgbWVtSm9iczogSm9iW10gPSBbXTtcbnRyeSB7XG4gICAgdmFyIGpvYnNKU09OID0gTWVtb3J5W1wiam9ic1wiXTtcbiAgICBpZiAoam9ic0pTT04gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1lbUpvYnMgPSBKU09OLnBhcnNlKGpvYnNKU09OLCBwYXJzZUpvYilcbiAgICB9XG59IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgcGFyc2luZyBpbiBtZW1vcnkgam9icyE6IFwiICsgZXggKyBcIlxcbiAgXCIgKyBNZW1vcnlbXCJqb2JzXCJdKVxuICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxufVxuXG5cblxuXG52YXIgcHJlSm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcbnJ1bkFsbEpvYnMoc3RhdGljSm9icywgbWVtSm9icylcbnZhciBwb3N0Sm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcblxuTWVtb3J5W1wiam9ic1wiXSA9IEpTT04uc3RyaW5naWZ5KG1lbUpvYnMpXG4vL2NvbnNvbGUubG9nKHBvc3RKb2JUcyAtIHByZUpvYlRzKVxuXG4vLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqb2JzKSlcbi8vIGNvbnNvbGUubG9nKFxuXG4vL3ZhciBqb2JzOkpvYltdID0gW11cblxuXG5cbkdhbWUuUm9sZXMgPSBSb2xlcyJdfQ==