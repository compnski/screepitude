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
        this.bodyReq = opts['body'];
        this.candidateFilter = opts['candidateFilter'];
        this.candidateCmp = opts['candidateCmp'];
    }
    Job.prototype.toJSON = function () {
        var jobFn = this.jobFunc;
        var filterFn = this.candidateFilter;
        var cmpFn = this.candidateCmp;
        console.log(this.start, this.name);
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
        case 'candidateFilter':
            return Filters[v];
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
        candidateFilter: Filters['carriesAndMoves'],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createFillJob = function (target) {
    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        end: target,
        jobFunc: Roles['carry'],
        candidateFilter: Filters['carriesAndMoves'],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createDeliverJob = function (target) {
    return new Job({
        namePrefix: 'carry',
        start: findNearestStorage(target),
        jobFunc: Roles['deliver'],
        candidateFilter: Filters['hasEneryAndMoves'],
        candidateCmp: Cmp['noop'],
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
    };
    var jobs = staticJobs.concat(memJobs);
    if (Memory['job_workers'] == undefined) {
        console.log("replacing worker map1!!");
        Memory['job_workers'] = {};
    }
    var creeps = [];
    for (var _i = 0, _a = Object.keys(Game.creeps); _i < _a.length; _i++) {
        var n = _a[_i];
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
        var creep;
        if (creepName != undefined) {
            creep = Game.creeps[creepName];
            console.log(job.start);
            if (!job.start) {
                console.log("Start disappeared for " + job.name);
                removeJob(job);
                if (creep != undefined) {
                    clearJob(creep, job);
                }
                return;
            }
            if (creep == undefined) {
                console.log("Bad creep found, replacing: " + JSON.stringify(creep));
                delete Memory['job_workers'][job.name];
                creepName = undefined;
            }
            else {
                setJob(creep, job);
            }
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
            if (job.jobFunc == Roles["carry"] && job.start["resourceType"] == RESOURCE_ENERGY) {
                if (resourcesById[job.start.id] == undefined) {
                    resourcesById[job.start.id] = 0;
                }
                if (job.creep != undefined) {
                    resourcesById[job.start.id] += job.creep.carryCapacity - job.creep.carry.energy;
                }
                else {
                    resourcesById[job.start.id] = Infinity;
                }
            }
        }
        for (var _f = 0; _f < resources.length; _f++) {
            var resource = resources[_f];
            var currentlyAllocatedCapacity = resourcesById[resource.id] || 0;
            if ((resource.amount - currentlyAllocatedCapacity) > GATHER_THRESHOLD) {
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
                    console.log("I'm a controller", struct);
                    break;
            }
        }
    }
    var noJob = function (c) {
        return c.job == undefined;
    };
    for (var _p = 0; _p < jobs.length; _p++) {
        var job = jobs[_p];
        if (job.creep != undefined) {
            continue;
        }
        console.log("Need to replace creep for job " + job.name);
        var candidates = creeps.filter(noJob).filter(job.candidateFilter).sort(job.candidateCmp);
        if (candidates.length > 0) {
            var creep = candidates[0];
            console.log("Picked creep for job " + job.name + " got " + creep.name);
            setJob(creep, job);
        }
        else {
            console.log("no candidates for job=" + job.name);
            continue;
        }
    }
    var runJob = function (creep, job) {
        var ret = creep.job.jobFunc(creep, creep.job);
        switch (ret) {
            case JOB_COMPLETE:
                creep.log("Job complete!");
                removeJob(creep.job);
                clearJob(creep, creep.job);
                break;
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
        if (creep.job != undefined) {
            creep.log("job=" + creep.job.name);
            if (creep.job.start == undefined) {
                removeJob(creep.job);
                clearJob(creep, creep.job);
                continue;
            }
            runJob(creep, job);
        }
        else if (creep.carry.energy > 0) {
            var j = createDeliverJob(creep);
            addJob(j);
            setJob(creep, j);
            runJob(creep, j);
        }
        else {
            creep.log("Nothing to do");
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
            var err = creep.transferEnergy(job.start);
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
                    console.log(typeof job.start, JSON.stringify(job.start));
                    err = job.start.transferEnergy(creep);
                }
                if (err == ERR_NOT_IN_RANGE) {
                    err = creep.moveTo(job.start);
                }
            }
        }
        if (creep.carry.energy == creep.carryCapacity) {
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
var Filters = {
    worksAndMoves: function (creep) {
        return creep.canWork() && creep.canMove();
    },
    carriesAndMoves: function (creep) {
        return creep.carryCapacity > creep.carry.energy && creep.canMove();
    },
    hasEneryAndMoves: function (creep) {
        return creep.carry.energy > 0 && creep.canMove();
    }
};
var FiltersReverse = {};
for (var _b = 0, _c = Object.keys(Filters); _b < _c.length; _b++) {
    var rn = _c[_b];
    var fn = Filters[rn];
    FiltersReverse[fn] = rn;
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
for (var _d = 0, _e = Object.keys(Cmp); _d < _e.length; _d++) {
    var rn = _e[_d];
    var fn = Cmp[rn];
    CmpReverse[fn] = rn;
}
;
var staticJobs = [new Job({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9tYWluLnRzIl0sIm5hbWVzIjpbIlN1cGVyQ3JlZXAiLCJTdXBlckNyZWVwLmNvbnN0cnVjdG9yIiwiU3VwZXJDcmVlcC5ob3dNYW55UGFydHMiLCJTdXBlckNyZWVwLmhhc1BhcnQiLCJTdXBlckNyZWVwLmNhbk1vdmUiLCJTdXBlckNyZWVwLmNhbldvcmsiLCJTdXBlckNyZWVwLmNhbkhlYWwiLCJTdXBlckNyZWVwLmNhbkF0dGFjayIsIlN1cGVyQ3JlZXAuY2FuU2hvb3QiLCJTdXBlckNyZWVwLmNhbkNsYWltIiwiU3VwZXJDcmVlcC5sb2ciLCJhcHBseU1peGlucyIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQU9BO0lBQUFBO0lBaURBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtJQUNwQ0EsQ0FBQ0E7SUFFREgsNEJBQU9BLEdBQVBBO1FBQ0lJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVESiw0QkFBT0EsR0FBUEE7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LElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUE7QUFFbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUE7QUFVeEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvLy8gPHJlZmVyZW5jZSBwYXRoPVwic2NyZWVwcy5kLnRzXCIgLz5cblxuXG5pbnRlcmZhY2UgU2NyZWVwIGV4dGVuZHMgQ3JlZXAsIFN1cGVyQ3JlZXB7XG4gICAgam9iPyA6IEpvYjtcbn1cblxuY2xhc3MgU3VwZXJDcmVlcCB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVuZXJneTogbnVtYmVyO1xuICAgIGJvZHk6IHtcblxuICAgICAgICAvKiogT25lIG9mIHRoZSBib2R5IHBhcnRzIGNvbnN0YW50cy4gKi9cbiAgICAgICAgdHlwZTogc3RyaW5nO1xuXG4gICAgICAgIC8qKiBUaGUgcmVtYWluaW5nIGFtb3VudCBvZiBoaXQgcG9pbnRzIG9mIHRoaXMgYm9keSBwYXJ0LiAqL1xuICAgICAgICBoaXRzOiBudW1iZXJcblxuICAgIH1bXTtcblxuXG4gICAgaG93TWFueVBhcnRzKHBhcnQ6c3RyaW5nKTpudW1iZXIge1xuICAgICAgcmV0dXJuIHRoaXMuYm9keS5maWx0ZXIocyA9PiB7IHJldHVybiAocy50eXBlID09IHBhcnQgJiYgcy5oaXRzID4gMCkgfSkubGVuZ3RoIFxuICAgIH1cblxuICAgIGhhc1BhcnQocGFydDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICByZXR1cm4gdGhpcy5ob3dNYW55UGFydHMocGFydCkgPiAwXG4gICAgfVxuXG4gICAgY2FuTW92ZSgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChNT1ZFKTtcbiAgICB9XG5cbiAgICBjYW5Xb3JrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KFdPUkspO1xuICAgIH1cblxuICAgIGNhbkhlYWwoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoSEVBTCk7XG4gICAgfVxuXG4gICAgY2FuQXR0YWNrKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KEFUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuU2hvb3QoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoUkFOR0VEX0FUVEFDSyk7XG4gICAgfVxuXG4gICAgY2FuQ2xhaW0oKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoQ0xBSU0pO1xuICAgIH1cblxuICAgIGxvZyguLi5tc2cpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJbXCIrdGhpcy5uYW1lK1wiXVwiLCAuLi5tc2cpXG4gICAgfVxufVxuXG5cblxuXG5mdW5jdGlvbiBhcHBseU1peGlucyhkZXJpdmVkQ3RvcjogYW55LCBiYXNlQ3RvcnM6IGFueVtdKSB7XG4gICAgYmFzZUN0b3JzLmZvckVhY2goYmFzZUN0b3IgPT4ge1xuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhiYXNlQ3Rvci5wcm90b3R5cGUpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgICBkZXJpdmVkQ3Rvci5wcm90b3R5cGVbbmFtZV0gPSBiYXNlQ3Rvci5wcm90b3R5cGVbbmFtZV07XG4gICAgICAgIH0pXG4gICAgfSk7IFxufVxuXG5cbmFwcGx5TWl4aW5zKENyZWVwLCBbU3VwZXJDcmVlcF0pXG5cbiIsIi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJzY3JlZXBzLmQudHNcIiAvPlxuLy8vIDxyZWZlcmVuY2UgcGF0aD1cImdsb2JhbHMudHNcIiAvPlxuXG4vL3JlcXVpcmUoJ2dsb2JhbHMnKVxuXG4vLyBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhTdXBlckNyZWVwLnByb3RvdHlwZSkuZm9yRWFjaChuYW1lID0+IHtcbi8vICAgQ3JlZXAucHJvdG90eXBlW25hbWVdID0gU3VwZXJDcmVlcC5wcm90b3R5cGVbbmFtZV1cbi8vIH0pXG5cbnR5cGUgSm9iRnVuYyA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4gbnVtYmVyO1xudHlwZSBDcmVlcEZpbHRlciA9IChjcmVlcDogU2NyZWVwKSA9PiBib29sZWFuO1xudHlwZSBDcmVlcENtcCA9IChhOiBDcmVlcCwgYjogU2NyZWVwKSA9PiBudW1iZXI7XG5cblxudmFyIEpPQl9DT01QTEVURSA9IDk5OVxuXG5pbnRlcmZhY2UgUG9zaXRpb25FbnRpdHkge1xuICAgIHBvczogUm9vbVBvc2l0aW9uXG4gICAgaWQ6IHN0cmluZ1xufVxuXG5pbnRlcmZhY2UgRW5lcmd5SG9sZGVyIGV4dGVuZHMgU3RydWN0dXJlIHtcbiAgICBlbmVyZ3k6IG51bWJlcjtcbiAgICBlbmVyZ3lDYXBhY2l0eTogbnVtYmVyO1xuICAgIHRyYW5zZmVyRW5lcmd5KGMgOkNyZWVwKVxufVxuXG5jbGFzcyBKb2Ige1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBzdGFydDogUG9zaXRpb25FbnRpdHk7XG4gICAgZW5kOiBQb3NpdGlvbkVudGl0eTtcbiAgICBqb2JGdW5jOiBKb2JGdW5jO1xuICAgIGNhbmRpZGF0ZUZpbHRlcjogQ3JlZXBGaWx0ZXI7XG4gICAgY2FuZGlkYXRlQ21wOiBDcmVlcENtcDtcbiAgICBjcmVlcDogU2NyZWVwOyAvLyBTZXQgZHVyaW5nIGV4ZWN1dGlvbmdcbiAgICBib2R5UmVxOiBCb2R5UGFydFtdXG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzID0ge30pIHtcbiAgICAgICAgdGhpcy5uYW1lID0gb3B0c1snbmFtZSddXG5cbiAgICAgICAgdmFyIG5wID0gb3B0c1snbmFtZVByZWZpeCddXG4gICAgICAgIGlmIChucCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChNZW1vcnlbXCJqb2JDb3VudHNcIl0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXSA9IHt9O1xuICAgICAgICAgICAgaWYgKE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gPSAwO1xuICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSArPSAxO1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gbnAgKyBcIl9cIiArIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN0YXJ0ID0gb3B0c1snc3RhcnQnXVxuICAgICAgICB0aGlzLmVuZCA9IG9wdHNbJ2VuZCddXG4gICAgICAgIHRoaXMuam9iRnVuYyA9IG9wdHNbJ2pvYkZ1bmMnXVxuICAgICAgICB0aGlzLmJvZHlSZXEgPSBvcHRzWydib2R5J11cbiAgICAgICAgdGhpcy5jYW5kaWRhdGVGaWx0ZXIgPSBvcHRzWydjYW5kaWRhdGVGaWx0ZXInXVxuICAgICAgICB0aGlzLmNhbmRpZGF0ZUNtcCA9IG9wdHNbJ2NhbmRpZGF0ZUNtcCddXG4gICAgfVxuXG4gICAgdG9KU09OKCkge1xuICAgICAgICB2YXIgam9iRm46IGFueSA9IHRoaXMuam9iRnVuYztcbiAgICAgICAgdmFyIGZpbHRlckZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUZpbHRlcjtcbiAgICAgICAgdmFyIGNtcEZuOiBhbnkgPSB0aGlzLmNhbmRpZGF0ZUNtcDtcbiAgICAgICAgY29uc29sZS5sb2codGhpcy5zdGFydCwgdGhpcy5uYW1lKVxuICAgICAgICB2YXIgcmV0ID0ge1xuICAgICAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICAgICAgc3RhcnQ6IHRoaXMuc3RhcnQuaWQsXG4gICAgICAgICAgICBqb2JGdW5jOiBSb2xlc1JldmVyc2Vbam9iRm5dLFxuICAgICAgICAgICAgY2FuZGlkYXRlRmlsdGVyOiBGaWx0ZXJzUmV2ZXJzZVtmaWx0ZXJGbl0sXG4gICAgICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFJldmVyc2VbY21wRm5dXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLmVuZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldFsnZW5kJ10gPSB0aGlzLmVuZC5pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0XG4gICAgfVxufVxuXG52YXIgcGFyc2VKb2IgPSAoazogc3RyaW5nLCB2KTogYW55ID0+IHtcbiAgICBzd2l0Y2ggKGspIHtcbiAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICBjYXNlICdlbmQnOlxuICAgICAgICAgICAgdmFyIHIgPSBHYW1lLmdldE9iamVjdEJ5SWQodilcbiAgICAgICAgICAgIGlmIChyID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRkFJTEVEIFRPIExPQUQgXCIgKyBrICsgXCIgZnJvbSBcIiArIHYpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqb2JGdW5jJzpcbiAgICAgICAgICAgIHJldHVybiBSb2xlc1t2XTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjYW5kaWRhdGVGaWx0ZXInOlxuICAgICAgICAgICAgcmV0dXJuIEZpbHRlcnNbdl07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY2FuZGlkYXRlQ21wJzpcbiAgICAgICAgICAgIHJldHVybiBDbXBbdl07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgICAgIHJldHVybiB2Lm1hcChvPT4geyByZXR1cm4gbmV3IEpvYihvKSB9KVxuICAgIH1cbiAgICByZXR1cm4gdlxufVxuXG52YXIgc2V0Sm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKSA9PiB7XG4gICAgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXSA9IGNyZWVwLm5hbWU7XG4gICAgam9iLmNyZWVwID0gY3JlZXA7XG4gICAgY3JlZXAuam9iID0gam9iO1xufVxuXG52YXIgY2xlYXJKb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpID0+IHtcbiAgICBkZWxldGUgTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICBkZWxldGUgam9iLmNyZWVwXG4gICAgZGVsZXRlIGNyZWVwLmpvYlxufVxuXG52YXIgZ2V0TXlTdHJ1Y3R1cmVzSW5BbGxSb29tcyA9IChzdHJ1Y3RUeXBlczogc3RyaW5nW10pOiBTdHJ1Y3R1cmVbXSA9PiB7XG4gICAgdmFyIHN0cnVjdHMgPSBbXVxuICAgIGZvciAodmFyIHJvb21OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUucm9vbXMpKSB7XG4gICAgICAgIHN0cnVjdHMucHVzaC5hcHBseShnZXRNeVN0cnVjdHVyZXNJblJvb20ocm9vbU5hbWUsIHN0cnVjdFR5cGVzKSlcbiAgICB9XG4gICAgcmV0dXJuIHN0cnVjdHM7XG59XG5cbnZhciBuZWVkc0VuZXJneSA9IChzOiBTdHJ1Y3R1cmUpOiBib29sZWFuID0+IHtcbiAgICBzd2l0Y2ggKHMuc3RydWN0dXJlVHlwZSkge1xuICAgICAgICBjYXNlIFNUUlVDVFVSRV9TVE9SQUdFOlxuICAgICAgICAgICAgcmV0dXJuICg8U3RvcmFnZT5zKS5zdG9yZS5lbmVyZ3kgPCAoPFN0b3JhZ2U+cykuc3RvcmVDYXBhY2l0eTtcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfVE9XRVI6XG4gICAgICAgICAgICByZXR1cm4gKDxUb3dlcj5zKS5lbmVyZ3kgPCAoPFRvd2VyPnMpLmVuZXJneUNhcGFjaXR5ICogLjc1XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1NQQVdOLCBTVFJVQ1RVUkVfRVhURU5TSU9OLCBTVFJVQ1RVUkVfTElOSywgU1RSVUNUVVJFX1BPV0VSX1NQQVdOOlxuICAgICAgICAgICAgcmV0dXJuICg8RW5lcmd5SG9sZGVyPnMpLmVuZXJneSA8ICg8RW5lcmd5SG9sZGVyPnMpLmVuZXJneUNhcGFjaXR5XG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxufVxuXG52YXIgZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tID0gKHJvb21OYW1lOiBzdHJpbmcsIHN0cnVjdFR5cGVzOiBzdHJpbmdbXSk6IFN0cnVjdHVyZVtdID0+IHtcbiAgICB2YXIgcm9vbTogUm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdXG4gICAgaWYgKHJvb20gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIC8vIFRPRE86IExvZz9cbiAgICAgICAgY29uc29sZS5sb2coXCJDYW4ndCBmaW5kIHJvb20gXCIgKyByb29tTmFtZSlcbiAgICAgICAgcmV0dXJuIFtdXG4gICAgfVxuICAgIGlmIChyb29tW1wibXlfc3RydWN0dXJlc1wiXSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcm9vbVtcIm15X3N0cnVjdHVyZXNcIl0gPSByb29tLmZpbmQoRklORF9NWV9TVFJVQ1RVUkVTKVxuICAgIH1cbiAgICByZXR1cm4gcm9vbVtcIm15X3N0cnVjdHVyZXNcIl0uZmlsdGVyKHM9PiB7IHJldHVybiBzdHJ1Y3RUeXBlcy5pbmRleE9mKHMuc3RydWN0dXJlVHlwZSkgPiAtMSB9KVxufVxuXG52YXIgZmluZE5lYXJlc3RTdG9yYWdlID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBTdHJ1Y3R1cmUgPT4ge1xuICAgIHZhciBzdG9yZXMgPSBnZXRNeVN0cnVjdHVyZXNJblJvb20odGFyZ2V0LnBvcy5yb29tTmFtZSwgW1NUUlVDVFVSRV9TVE9SQUdFXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luUm9vbSh0YXJnZXQucG9zLnJvb21OYW1lLCBbU1RSVUNUVVJFX1RPV0VSXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMoW1NUUlVDVFVSRV9TVE9SQUdFXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIGlmIChzdG9yZXMubGVuZ3RoID09IDApXG4gICAgICAgIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luQWxsUm9vbXMoW1NUUlVDVFVSRV9TUEFXTl0pLmZpbHRlcihuZWVkc0VuZXJneSlcbiAgICByZXR1cm4gdGFyZ2V0LnBvcy5maW5kQ2xvc2VzdEJ5UmFuZ2Uoc3RvcmVzKVxufVxuXG52YXIgY3JlYXRlUGlja3VwSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2NhcnJ5JyxcbiAgICAgICAgc3RhcnQ6IHRhcmdldCxcbiAgICAgICAgZW5kOiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2NhcnJ5J10sXG4gICAgICAgIGNhbmRpZGF0ZUZpbHRlcjogRmlsdGVyc1snY2Fycmllc0FuZE1vdmVzJ10sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVGaWxsSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2NhcnJ5JyxcbiAgICAgICAgc3RhcnQ6IGZpbmROZWFyZXN0U3RvcmFnZSh0YXJnZXQpLFxuICAgICAgICBlbmQ6IHRhcmdldCxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2NhcnJ5J10sXG4gICAgICAgIGNhbmRpZGF0ZUZpbHRlcjogRmlsdGVyc1snY2Fycmllc0FuZE1vdmVzJ10sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cblxudmFyIGNyZWF0ZURlbGl2ZXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG5cbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICdjYXJyeScsXG4gICAgICAgIHN0YXJ0OiBmaW5kTmVhcmVzdFN0b3JhZ2UodGFyZ2V0KSxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2RlbGl2ZXInXSxcbiAgICAgICAgY2FuZGlkYXRlRmlsdGVyOiBGaWx0ZXJzWydoYXNFbmVyeUFuZE1vdmVzJ10sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydub29wJ10sXG4gICAgfSlcbn1cblxuLy8gVE9ETzogQVBJIHRvIGFkZCBqb2JzLCBzb21lIHdheSB0byBjb21iaW5lIGluLW1lbW9yeSBqb2JzIHdpdGggaW4tY29kZSBqb2JzXG4vLyBmaXRuZXNzIGZ1bmMgZm9yIGNhbmRpZGF0ZXMgYmFzZWQgb24gZGlzdGFuY2UuXG52YXIgcnVuQWxsSm9icyA9IChzdGF0aWNKb2JzOiBKb2JbXSwgbWVtSm9iczogSm9iW10pID0+IHtcblxuICAgIHZhciBhZGRKb2IgPSAoam9iOiBKb2IpID0+IHtcbiAgICAgICAgbWVtSm9icy5wdXNoKGpvYilcbiAgICB9XG5cbiAgICB2YXIgcmVtb3ZlSm9iID0gKGpvYjogSm9iKSA9PiB7XG4gICAgICAgIHZhciBpZHggPSBtZW1Kb2JzLmluZGV4T2Yoam9iKVxuICAgICAgICBpZiAoaWR4IDwgMCkgcmV0dXJuXG4gICAgICAgIG1lbUpvYnMuc3BsaWNlKGlkeCwgMSlcbiAgICB9XG5cbiAgICB2YXIgam9icyA9IHN0YXRpY0pvYnMuY29uY2F0KG1lbUpvYnMpXG5cbiAgICBpZiAoTWVtb3J5Wydqb2Jfd29ya2VycyddID09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcInJlcGxhY2luZyB3b3JrZXIgbWFwMSEhXCIpXG4gICAgICAgIE1lbW9yeVsnam9iX3dvcmtlcnMnXSA9IHt9XG4gICAgfVxuICAgIHZhciBjcmVlcHM6IFNjcmVlcFtdID0gW11cbiAgICBmb3IgKHZhciBuIG9mIE9iamVjdC5rZXlzKEdhbWUuY3JlZXBzKSkge1xuICAgICAgICBjcmVlcHMucHVzaChHYW1lLmNyZWVwc1tuXSlcbiAgICB9XG5cbiAgICB2YXIgc2VlbkpvYnM6IHsgW2luZGV4OiBzdHJpbmddOiBib29sZWFuIH0gPSB7fVxuXG5cbiAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAvLyBjaGVjayBpZiBzdGlsbCB2YWxpZFxuXG4gICAgICAgIC8vIENoZWNrIGZvciBEdXBlXG4gICAgICAgIGlmIChzZWVuSm9ic1tqb2IubmFtZV0pIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRFVQTElDQVRFIEpPQiBJTiBMSVNUISEgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgfVxuICAgICAgICBzZWVuSm9ic1tqb2IubmFtZV0gPSB0cnVlXG5cbiAgICAgICAgdmFyIGNyZWVwTmFtZTogc3RyaW5nID0gTWVtb3J5Wydqb2Jfd29ya2VycyddW2pvYi5uYW1lXTtcbiAgICAgICAgdmFyIGNyZWVwOiBTY3JlZXA7XG4gICAgICAgIGlmIChjcmVlcE5hbWUgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjcmVlcCA9IEdhbWUuY3JlZXBzW2NyZWVwTmFtZV1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGpvYi5zdGFydClcbiAgICAgICAgICAgIGlmICgham9iLnN0YXJ0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTdGFydCBkaXNhcHBlYXJlZCBmb3IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgICAgICAgICByZW1vdmVKb2Ioam9iKVxuICAgICAgICAgICAgICAgIGlmIChjcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGpvYilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY3JlZXAgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJCYWQgY3JlZXAgZm91bmQsIHJlcGxhY2luZzogXCIgKyBKU09OLnN0cmluZ2lmeShjcmVlcCkpXG4gICAgICAgICAgICAgICAgZGVsZXRlIE1lbW9yeVsnam9iX3dvcmtlcnMnXVtqb2IubmFtZV07XG4gICAgICAgICAgICAgICAgY3JlZXBOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXRKb2IoY3JlZXAsIGpvYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEpvYiBjcmVhdG9yc1xuXG4gICAgLy8gR2F0aGVyIGRyb3BwZWQgcmVzb3VyY2VzXG4gICAgdmFyIEdBVEhFUl9USFJFU0hPTEQgPSAyMDAgLy8gVE9ETzogU2V0IGJhc2VkIG9uIGF2YWlsYWJsZSBjcmVlcHNcbiAgICBmb3IgKHZhciByb29tTmFtZSBvZiBPYmplY3Qua2V5cyhHYW1lLnJvb21zKSkge1xuICAgICAgICB2YXIgcm9vbSA9IEdhbWUucm9vbXNbcm9vbU5hbWVdXG4gICAgICAgIHZhciByZXNvdXJjZXMgPSByb29tLmZpbmQoRklORF9EUk9QUEVEX1JFU09VUkNFUylcbiAgICAgICAgdmFyIHJlc291cmNlc0J5SWQ6IHsgW2luZGV4OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9XG4gICAgICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgICAgICBpZiAoam9iLmpvYkZ1bmMgPT0gUm9sZXNbXCJjYXJyeVwiXSAmJiBqb2Iuc3RhcnRbXCJyZXNvdXJjZVR5cGVcIl0gPT0gUkVTT1VSQ0VfRU5FUkdZKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGpvYi5jcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdICs9IGpvYi5jcmVlcC5jYXJyeUNhcGFjaXR5IC0gam9iLmNyZWVwLmNhcnJ5LmVuZXJneTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHdhbnQgb25lIGVtcHR5IGpvYiBwZXIgcmVzb3VyY2UsIGRlZmF1bHQgdG8gaW5maW5pdHkgaWYgdGhlcmUgYXJlIG5vIGNyZWVwc1xuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gPSBJbmZpbml0eTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgcmVzb3VyY2Ugb2YgcmVzb3VyY2VzKSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudGx5QWxsb2NhdGVkQ2FwYWNpdHkgPSByZXNvdXJjZXNCeUlkW3Jlc291cmNlLmlkXSB8fCAwO1xuICAgICAgICAgICAgaWYgKChyZXNvdXJjZS5hbW91bnQgLSBjdXJyZW50bHlBbGxvY2F0ZWRDYXBhY2l0eSkgPiBHQVRIRVJfVEhSRVNIT0xEKSB7XG4gICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVBpY2t1cEpvYihyZXNvdXJjZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFID0gW1NUUlVDVFVSRV9UT1dFUiwgU1RSVUNUVVJFX0NPTlRST0xMRVIsIFNUUlVDVFVSRV9TUEFXTiwgU1RSVUNUVVJFX0VYVEVOU0lPTl1cbiAgICB2YXIgc3RydWN0dXJlcyA9IHt9XG4gICAgZm9yICh2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgdmFyIHJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXTtcbiAgICAgICAgdmFyIHJvb21TdHJ1Y3R1cmVzID0gcm9vbS5maW5kKEZJTkRfU1RSVUNUVVJFUylcbiAgICAgICAgZm9yICh2YXIgc3RydWN0VHlwZSBvZiBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFKSB7XG4gICAgICAgICAgICBzdHJ1Y3R1cmVzW3N0cnVjdFR5cGVdID0gKHN0cnVjdHVyZXNbc3RydWN0VHlwZV0gfHwgW10pLmNvbmNhdChyb29tU3RydWN0dXJlcy5maWx0ZXIocz0+IHsgcmV0dXJuIHMuc3RydWN0dXJlVHlwZSA9PSBzdHJ1Y3RUeXBlIH0pKVxuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIHN0cnVjdFR5cGUgb2YgU1RSVUNUVVJFU19UT19JTlZFU1RJR0FURSkge1xuICAgICAgICBmb3IgKHZhciBzdHJ1Y3Qgb2Ygc3RydWN0dXJlc1tzdHJ1Y3RUeXBlXSkge1xuICAgICAgICAgICAgdmFyIGpvYnNGb3JTdHJ1Y3QgPSBbXVxuICAgICAgICAgICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoam9iLnN0YXJ0ICYmIGpvYi5zdGFydC5pZCA9PSBzdHJ1Y3QuaWQgfHwgKGpvYi5lbmQgJiYgam9iLmVuZC5pZCA9PSBzdHJ1Y3QuaWQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGpvYnNGb3JTdHJ1Y3QucHVzaChqb2IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIG5lZWQgbmV3IGpvYnMgbm93XG4gICAgICAgICAgICBzd2l0Y2ggKHN0cnVjdFR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjpcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTjpcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9FWFRFTlNJT046XG4gICAgICAgICAgICAgICAgICAgIGlmKHN0cnVjdC5lbmVyZ3kgPCBzdHJ1Y3QuZW5lcmd5Q2FwYWNpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGpvYnNGb3JTdHJ1Y3QubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRKb2IoY3JlYXRlRmlsbEpvYihzdHJ1Y3QpKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX0NPTlRST0xMRVI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSSdtIGEgY29udHJvbGxlclwiLCBzdHJ1Y3QpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFVwZ3JhZGUgYWxsIGNvbnRyb2xsZXJzXG4gICAgLy8gaXRlcmF0cmUgdGhyb3VnaCByb29tcywgbWFrZSBzdXJlIHdlIGhhdmUgam9icyBmb3IgZWFjaCBjb250cm9sbGVyLCBiYXNlZCBvbiBsb2NhbCBlbmVyZ3kgc2l0dWF0aW9uIGFuZCAjZnJlZSBzbG90cyBhcm91bmQgY29udHJvbGxlciAobG9vayBhdCBtaW5lIGNvZGUpXG5cbiAgICAvLyBmb3IgZWFjZWggcm9vbSwgaXRlcmF0ZSB0aHJvdWdoIHN0cnVjdXRyZXMsIGdldCBsaXN0IG9mIGpvYnMgcmVmZXJlbmNpbmcgdGhhdCBzdHJ1Y3R1cmVzLCBjcmVhdGUgbmV3IGpvYnMgYmFzZWQgb24gdHlwZSBbVE9ETywgYWRkIHJlc291cmNlIGpvYnMgdG8gc2FtZSBmcmFtZXdvcms/XVxuXG4gICAgLy8gRmlsbCBzcGF3bnMsIGV4dGVuc2lvbnMsIHRvd2Vyc1xuXG4gICAgLy8gTWluZSBhbGwgc291cmNlc1xuICAgIC8vIEZpbmQgYWxsIHNvdXJjZXMgaW4gcm9vbXMsIG1ha2Ugc3VyZSB0aGVyZSBpcyBhIGpvYiB0byBtaW5lIGVhY2hcblxuICAgIC8vIEJ1aWxkIHRoaW5nc1xuICAgIC8vIFJlcGFpciB0aGluZ3NcbiAgICAvLyBldGMuXG5cbiAgICAvLyBEZWZlbmQsIGF0dGFjaywgZXRjLlxuXG5cbiAgICAvLyBFdmVudHVhbGx5IGhhdmUgcGFydCB0aGF0IGJ1aWxkcyBjcmVlcHNcblxuXG5cblxuICAgIC8vIEFsbG9jYXRlIGpvYnNcblxuXG4gICAgdmFyIG5vSm9iID0gKGM6IFNjcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICByZXR1cm4gYy5qb2IgPT0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgaWYgKGpvYi5jcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vcGljayBuZXcgb25lXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmVlZCB0byByZXBsYWNlIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgLy8gVE9ETyBmaWd1cmUgb3V0IGN1cnJ5aW5nIHRvIHBhc3Mgam9iIGludG8gY21wIGZ1bmN0aW9uXG4gICAgICAgIHZhciBjYW5kaWRhdGVzOiBTY3JlZXBbXSA9IGNyZWVwcy5maWx0ZXIobm9Kb2IpLmZpbHRlcihqb2IuY2FuZGlkYXRlRmlsdGVyKS5zb3J0KGpvYi5jYW5kaWRhdGVDbXApXG4gICAgICAgIGlmIChjYW5kaWRhdGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBjcmVlcDogU2NyZWVwID0gY2FuZGlkYXRlc1swXTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGlja2VkIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSArIFwiIGdvdCBcIiArIGNyZWVwLm5hbWUpO1xuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICAgICAgLy8gY2FsbCBzZXRKb2I/Pz9cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm8gY2FuZGlkYXRlcyBmb3Igam9iPVwiICsgam9iLm5hbWUpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBydW5Kb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICB2YXIgcmV0ID0gY3JlZXAuam9iLmpvYkZ1bmMoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgc3dpdGNoIChyZXQpIHtcbiAgICAgICAgICAgIGNhc2UgSk9CX0NPTVBMRVRFOlxuICAgICAgICAgICAgICAgIGNyZWVwLmxvZyhcIkpvYiBjb21wbGV0ZSFcIilcbiAgICAgICAgICAgICAgICByZW1vdmVKb2IoY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIEVSUl9OT1RfRk9VTkQ6XG4gICAgICAgICAgICBjYXNlIEVSUl9JTlZBTElEX1RBUkdFVDpcbiAgICAgICAgICAgIGNhc2UgRVJSX0ZVTEw6XG4gICAgICAgICAgICBjYXNlIEVSUl9JTlZBTElEX0FSR1M6XG4gICAgICAgICAgICBjYXNlIEVSUl9OT1RfT1dORVI6XG4gICAgICAgICAgICAgICAgY3JlZXAubG9nKFwiSm9iIEZhaWxlZCEhIGVycj1cIiArIHJldClcbiAgICAgICAgICAgICAgICByZW1vdmVKb2IoY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBjcmVlcC5qb2IpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldFxuICAgIH1cblxuICAgIGpvYiA9IG51bGxcbiAgICBmb3IgKHZhciBjcmVlcCBvZiBjcmVlcHMpIHtcbiAgICAgICAgaWYgKGNyZWVwLmpvYiAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNyZWVwLmxvZyhcImpvYj1cIiArIGNyZWVwLmpvYi5uYW1lKVxuICAgICAgICAgICAgaWYgKGNyZWVwLmpvYi5zdGFydCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPOiBDbGVhbnVwXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcnVuSm9iKGNyZWVwLCBqb2IpXG4gICAgICAgIH0gZWxzZSBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID4gMCkge1xuICAgICAgICAgICAgdmFyIGogPSBjcmVhdGVEZWxpdmVySm9iKGNyZWVwKVxuICAgICAgICAgICAgYWRkSm9iKGopXG4gICAgICAgICAgICBzZXRKb2IoY3JlZXAsIGopXG4gICAgICAgICAgICBydW5Kb2IoY3JlZXAsIGopXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJOb3RoaW5nIHRvIGRvXCIpXG4gICAgICAgIH1cbiAgICB9XG59XG5cblxudmFyIGhhc0VuZXJneSA9IChzKSA9PiB7XG4gICAgaWYgKHMuYW1vdW50ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5hbW91bnQgPiAwO1xuICAgIH1cblxuICAgIGlmIChzLnN0b3JlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5zdG9yZS5lbmVyZ3kgPiAwO1xuICAgIH1cbiAgICBpZiAocy5jYXJyeSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuY2FycnkuZW5lcmd5ID4gMFxuICAgIH1cbiAgICBpZiAocy5lbmVyZ3kgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmVuZXJneSA+IDBcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBSb2xlczogeyBbaW5kZXg6IHN0cmluZ106IEpvYkZ1bmMgfSA9IHtcbiAgICBtZWdhTWluZXI6IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYik6IG51bWJlciA9PiB7XG4gICAgICAgIHZhciBzb3VyY2VJZCA9IGNyZWVwLm1lbW9yeS5zSWQ7XG5cbiAgICAgICAgdmFyIHNvdXJjZTtcbiAgICAgICAgaWYgKHNvdXJjZUlkICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc291cmNlID0gR2FtZS5nZXRPYmplY3RCeUlkKHNvdXJjZUlkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc291cmNlID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQsIHsgcmV1c2VQYXRoOiAyMCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjcmVlcC5sb2coam9iLnN0YXJ0KVxuICAgICAgICAgICAgc291cmNlID0gam9iLnN0YXJ0LnBvcy5maW5kQ2xvc2VzdEJ5UmFuZ2UoRklORF9TT1VSQ0VTKVxuICAgICAgICAgICAgaWYgKHNvdXJjZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tZW1vcnkuc0lkID0gc291cmNlLmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB2YXIgZXJyID0gY3JlZXAuaGFydmVzdChzb3VyY2UpO1xuICAgICAgICAgICAgaWYgKGVyciA9PSBFUlJfTk9UX0lOX1JBTkdFKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKHNvdXJjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9LFxuXG4gICAgZGVsaXZlcjogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKCFjcmVlcC5wb3MuaXNOZWFyVG8oam9iLnN0YXJ0KSkge1xuICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBlcnIgPSBjcmVlcC50cmFuc2ZlckVuZXJneSg8U3RydWN0dXJlPmpvYi5zdGFydCk7XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBKT0JfQ09NUExFVEU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVyclxuICAgIH0sXG5cbiAgICBjYXJyeTogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcblxuICAgICAgICBpZiAoam9iLnN0YXJ0ICE9IHVuZGVmaW5lZCAmJiBjcmVlcC5jYXJyeS5lbmVyZ3kgPCBjcmVlcC5jYXJyeUNhcGFjaXR5ICYmIGhhc0VuZXJneShqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycjtcbiAgICAgICAgICAgICAgICBpZiAoKDxFbmVyZ3k+am9iLnN0YXJ0KS5hbW91bnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnBpY2t1cCg8RW5lcmd5PmpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codHlwZW9mIGpvYi5zdGFydCwgSlNPTi5zdHJpbmdpZnkoam9iLnN0YXJ0KSlcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gKDxFbmVyZ3lIb2xkZXI+am9iLnN0YXJ0KS50cmFuc2ZlckVuZXJneShjcmVlcClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKGpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuXG4gICAgICAgIGlmIChjcmVlcC5jYXJyeS5lbmVyZ3kgPT0gY3JlZXAuY2FycnlDYXBhY2l0eSkge1xuICAgICAgICAgICAgam9iLmpvYkZ1bmMgPSBSb2xlc1snZGVsaXZlciddXG4gICAgICAgICAgICBqb2Iuc3RhcnQgPSBqb2IuZW5kXG4gICAgICAgICAgICBpZiAoam9iLmVuZCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBqb2IuZW5kID0gZmluZE5lYXJlc3RTdG9yYWdlKGNyZWVwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIGpvYi5lbmRcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyO1xuICAgIH1cbn1cbnZhciBSb2xlc1JldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoUm9sZXMpKSB7XG4gICAgdmFyIGZuOiBhbnkgPSBSb2xlc1tybl1cbiAgICBSb2xlc1JldmVyc2VbZm5dID0gcm5cbn1cblxuXG52YXIgRmlsdGVyczogeyBbaW5kZXg6IHN0cmluZ106IENyZWVwRmlsdGVyIH0gPSB7XG4gICAgd29ya3NBbmRNb3ZlczogKGNyZWVwOiBTY3JlZXApOiBib29sZWFuPT4ge1xuICAgICAgICByZXR1cm4gY3JlZXAuY2FuV29yaygpICYmIGNyZWVwLmNhbk1vdmUoKTtcbiAgICB9LFxuXG4gICAgY2Fycmllc0FuZE1vdmVzOiAoY3JlZXA6IFNjcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICByZXR1cm4gY3JlZXAuY2FycnlDYXBhY2l0eSA+IGNyZWVwLmNhcnJ5LmVuZXJneSAmJiBjcmVlcC5jYW5Nb3ZlKCk7XG4gICAgfSxcbiAgICBoYXNFbmVyeUFuZE1vdmVzOiAoY3JlZXA6IFNjcmVlcCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICByZXR1cm4gY3JlZXAuY2FycnkuZW5lcmd5ID4gMCAmJiBjcmVlcC5jYW5Nb3ZlKCk7XG4gICAgfVxuXG59XG52YXIgRmlsdGVyc1JldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoRmlsdGVycykpIHtcbiAgICB2YXIgZm46IGFueSA9IEZpbHRlcnNbcm5dXG4gICAgRmlsdGVyc1JldmVyc2VbZm5dID0gcm5cbn1cblxudmFyIENtcDogeyBbaW5kZXg6IHN0cmluZ106IENyZWVwQ21wIH0gPSB7XG4gICAgd29ya3NIYXJkOiAoYTogU2NyZWVwLCBiOiBTY3JlZXApOiBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gYi5ob3dNYW55UGFydHMoV09SSykgLSBhLmhvd01hbnlQYXJ0cyhXT1JLKVxuICAgIH0sXG5cbiAgICBjYXJyaWVzVGhlTW9zdDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIChhLmNhcnJ5Q2FwYWNpdHkgLSBhLmNhcnJ5LmVuZXJneSkgLSAoYi5jYXJyeUNhcGFjaXR5IC0gYi5jYXJyeS5lbmVyZ3kpXG4gICAgfSxcbiAgICBub29wOiAoYTogU2NyZWVwLCBiOiBTY3JlZXApOiBudW1iZXIgPT4ge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cblxuICAgIC8vIGNsb3NlVG9TdGFydDogKGE6Q3JlZXAsIGI6Q3JlZXApIDogbnVtYmVyID0+IHtcbiAgICAvLyAgICAgcmV0dXJuIGEucG9zLmdldFJhbmdlVG8oY3JlZXAuam9iLnN0YXJ0KSAtIGIucG9zLmdldFJhbmdlVG8oY3JlZXAuam9iLnN0YXJ0KTtcbiAgICAvLyB9XG59XG52YXIgQ21wUmV2ZXJzZSA9IHt9XG5mb3IgKHZhciBybiBvZiBPYmplY3Qua2V5cyhDbXApKSB7XG4gICAgdmFyIGZuOiBhbnkgPSBDbXBbcm5dO1xuICAgIENtcFJldmVyc2VbZm5dID0gcm47XG59O1xuXG5cbnZhciBzdGF0aWNKb2JzOiBKb2JbXSA9IFtuZXcgSm9iKHtcbiAgICBuYW1lOiBcIm1lZ2FfbWluZXJfMVwiLFxuICAgIHN0YXJ0OiBHYW1lLmZsYWdzWydNaW5lXzFfMSddLFxuICAgIGpvYkZ1bmM6IFJvbGVzWydtZWdhTWluZXInXSxcbiAgICBjYW5kaWRhdGVGaWx0ZXI6IEZpbHRlcnNbJ3dvcmtzQW5kTW92ZXMnXSxcbiAgICBjYW5kaWRhdGVDbXA6IENtcFsnd29ya3NIYXJkJ10sXG59KSwgbmV3IEpvYih7XG4gICAgbmFtZTogXCJtZWdhX21pbmVyXzJcIixcbiAgICBzdGFydDogR2FtZS5mbGFnc1snTWluZV8xXzInXSxcbiAgICBqb2JGdW5jOiBSb2xlc1snbWVnYU1pbmVyJ10sXG4gICAgY2FuZGlkYXRlRmlsdGVyOiBGaWx0ZXJzWyd3b3Jrc0FuZE1vdmVzJ10sXG4gICAgY2FuZGlkYXRlQ21wOiBDbXBbJ3dvcmtzSGFyZCddLFxufSldXG5cblxuXG52YXIgbWVtSm9iczogSm9iW10gPSBbXTtcbnRyeSB7XG4gICAgdmFyIGpvYnNKU09OID0gTWVtb3J5W1wiam9ic1wiXTtcbiAgICBpZiAoam9ic0pTT04gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1lbUpvYnMgPSBKU09OLnBhcnNlKGpvYnNKU09OLCBwYXJzZUpvYilcbiAgICB9XG59IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgcGFyc2luZyBpbiBtZW1vcnkgam9icyE6IFwiICsgZXggKyBcIlxcbiAgXCIgKyBNZW1vcnlbXCJqb2JzXCJdKVxuICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxufVxuXG5cblxuXG52YXIgcHJlSm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcbnJ1bkFsbEpvYnMoc3RhdGljSm9icywgbWVtSm9icylcbnZhciBwb3N0Sm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcblxuTWVtb3J5W1wiam9ic1wiXSA9IEpTT04uc3RyaW5naWZ5KG1lbUpvYnMpXG4vL2NvbnNvbGUubG9nKHBvc3RKb2JUcyAtIHByZUpvYlRzKVxuXG4vLyBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShqb2JzKSlcbi8vIGNvbnNvbGUubG9nKFxuXG4vL3ZhciBqb2JzOkpvYltdID0gW11cblxuXG5cbkdhbWUuUm9sZXMgPSBSb2xlcyJdfQ==