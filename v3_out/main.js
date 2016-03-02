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
var createRepairJob = function (target) {
    return new Job({
        namePrefix: 'repair',
        start: target,
        jobFunc: Roles['repair'],
        bodyReq: [MOVE, WORK, CARRY],
        candidateCmp: Cmp['carriesTheMost'],
    });
};
var createMinerJob = function (target) {
    return new Job({
        name: "miner",
        start: target,
        jobFunc: Roles['megaMiner'],
        bodyReq: [WORK, WORK, MOVE],
        candidateCmp: Cmp['worksHard'],
    });
};
var needsRepair = function (s) {
    if (s.structureType == STRUCTURE_WALL) {
        return s.hits < Math.min(s.hitsMax, 50000);
    }
    if (s.structureType == STRUCTURE_RAMPART) {
        return s.hits < Math.min(s.hitsMax, 10000);
    }
    return s.hits < s.hitsMax;
};
var roomControlledByMe = function (room) {
    if (room == undefined || room.controller == undefined)
        return false;
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
var runAllJobs = function (jobs) {
    var addJob = function (job) {
        jobs.push(job);
    };
    var removeJob = function (job) {
        var idx = jobs.indexOf(job);
        if (idx < 0)
            return;
        jobs.splice(idx, 1);
    };
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
        for (var _f = 0; _f < resources.length; _f++) {
            var resource = resources[_f];
            var currentlyAllocatedCapacity = resourcesById[resource.id] || 0;
            if ((resource.amount - currentlyAllocatedCapacity) > GATHER_THRESHOLD) {
                console.log("New pickup job");
                addJob(createPickupJob(resource));
            }
        }
    }
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
    var STRUCTURES_TO_INVESTIGATE = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_CONTROLLER];
    var structures = {};
    for (var _g = 0, _h = Object.keys(Game.rooms); _g < _h.length; _g++) {
        var roomName = _h[_g];
        var room = Game.rooms[roomName];
        var roomStructures = room.find(FIND_STRUCTURES);
        for (var _j = 0; _j < STRUCTURES_TO_INVESTIGATE.length; _j++) {
            var structType = STRUCTURES_TO_INVESTIGATE[_j];
            structures[structType] = (structures[structType] || []).concat(roomStructures.filter(function (s) { return s.structureType == structType; }));
        }
        if (roomControlledByMe(room)) {
            for (var _k = 0, _l = room.find(FIND_SOURCES); _k < _l.length; _k++) {
                var source = _l[_k];
                if (jobs.filter(function (job) { return job.jobFunc == Roles['megaMiner'] && job.start && job.start.id == source.id; }).length == 0) {
                    addJob(createMinerJob(source));
                }
            }
        }
    }
    for (var _m = 0; _m < STRUCTURES_TO_INVESTIGATE.length; _m++) {
        var structType = STRUCTURES_TO_INVESTIGATE[_m];
        for (var _o = 0, _p = structures[structType]; _o < _p.length; _o++) {
            var struct = _p[_o];
            if (struct.owner && struct.owner.username != 'omgbear')
                continue;
            var jobsForStruct = [];
            for (var _q = 0; _q < jobs.length; _q++) {
                var job = jobs[_q];
                if (job.start && job.start.id == struct.id || (job.end && job.end.id == struct.id)) {
                    jobsForStruct.push(job);
                }
            }
            switch (structType) {
                case STRUCTURE_TOWER:
                    runTower(struct);
                    if (struct.energy < struct.energyCapacity) {
                        if (jobsForStruct.length < 3) {
                            addJob(createFillJob(struct));
                        }
                    }
                    break;
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
    for (var _r = 0; _r < roomStructures.length; _r++) {
        var struct = roomStructures[_r];
        if (ownedByMe(struct) && needsRepair(struct)) {
            var jobExists = false;
            for (var _s = 0; _s < jobs.length; _s++) {
                var j = jobs[_s];
                if (j.jobFunc == Roles['repair'] && j.start.id == struct.id) {
                    jobExists = true;
                    break;
                }
                if (jobExists)
                    break;
            }
            if (!jobExists) {
                console.log("Repair site: " + struct.id);
                addJob(createRepairJob(struct));
            }
        }
    }
    var roomSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    for (var _t = 0; _t < roomSites.length; _t++) {
        var site = roomSites[_t];
        var jobsForSite = [];
        for (var _u = 0; _u < jobs.length; _u++) {
            var job = jobs[_u];
            if (job.start && job.start.id == struct.id || (job.end && job.end.id == struct.id)) {
                jobsForSite.push(job);
            }
        }
        var BUILDERS_PER_SITE = 2;
        if (jobsForSite.length < BUILDERS_PER_SITE) {
            addJob(createBuildJob(site));
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
        var candidates = creeps.filter(noJob).filter(getCandidateFilter(job.bodyReq)).sort(job.candidateCmp);
        if (candidates.length > 0) {
            return candidates[0];
        }
        else {
            return null;
        }
    };
    var neededCreeps = [];
    for (var _v = 0; _v < jobs.length; _v++) {
        var job = jobs[_v];
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
    for (var _w = 0; _w < creeps.length; _w++) {
        var creep = creeps[_w];
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
var transferEnergy = function (from, to) {
    if (from.transferEnergy != undefined) {
        return from.transferEnergy(to);
    }
    if (from.transfer != undefined) {
        return from.transfer(to, RESOURCE_ENERGY);
    }
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
    repair: function (creep, job) {
        if (creep.carry.energy == 0) {
            var energySource = findNearestStorage(creep);
            var err = ERR_NOT_IN_RANGE;
            if (creep.pos.isNearTo(energySource)) {
                err = transferEnergy(energySource, creep);
            }
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(energySource, { reusePath: 40, maxOps: 1000 });
            }
        }
        if (!creep.pos.isNearTo(job.start)) {
            creep.moveTo(job.start, { reusePath: 40, maxOps: 1000 });
        }
        else {
            err = creep.repair(job.start);
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.start);
            }
        }
        if (creep.carry.energy == 0) {
            return JOB_COMPLETE;
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
runAllJobs(memJobs);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3YzL2dsb2JhbHMudHMiLCIuLi92My9tYWluLnRzIl0sIm5hbWVzIjpbIlN1cGVyQ3JlZXAiLCJTdXBlckNyZWVwLmNvbnN0cnVjdG9yIiwiU3VwZXJDcmVlcC5ob3dNYW55UGFydHMiLCJTdXBlckNyZWVwLmhhc1BhcnQiLCJTdXBlckNyZWVwLmNhbk1vdmUiLCJTdXBlckNyZWVwLmNhbldvcmsiLCJTdXBlckNyZWVwLmNhbkhlYWwiLCJTdXBlckNyZWVwLmNhbkF0dGFjayIsIlN1cGVyQ3JlZXAuY2FuU2hvb3QiLCJTdXBlckNyZWVwLmNhbkNsYWltIiwiU3VwZXJDcmVlcC5sb2ciLCJhcHBseU1peGlucyIsIkpvYiIsIkpvYi5jb25zdHJ1Y3RvciIsIkpvYi50b0pTT04iXSwibWFwcGluZ3MiOiJBQVlBO0lBQUFBO0lBZ0RBQyxDQUFDQTtJQW5DR0QsaUNBQVlBLEdBQVpBLFVBQWFBLElBQVdBO1FBQ3RCRSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQSxNQUFNQSxDQUFDQSxVQUFBQSxDQUFDQSxJQUFNQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxJQUFJQSxJQUFJQSxJQUFJQSxDQUFDQSxDQUFDQSxJQUFJQSxHQUFHQSxDQUFDQSxDQUFDQSxDQUFBQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFBQTtJQUNoRkEsQ0FBQ0E7SUFFREYsNEJBQU9BLEdBQVBBLFVBQVFBLElBQVlBO1FBQ2xCRyxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxZQUFZQSxDQUFDQSxJQUFJQSxDQUFDQSxHQUFHQSxDQUFDQSxDQUFBQTtJQUNwQ0EsQ0FBQ0E7SUFFREgsNEJBQU9BLEdBQVBBO1FBQ0lJLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLENBQUNBLElBQUlBLENBQUNBLENBQUNBO0lBQzlCQSxDQUFDQTtJQUVESiw0QkFBT0EsR0FBUEE7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QSxDQUFDQSxLQUFLQSxHQUFHQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQSxDQUFBQTtRQUMxQkEsSUFBSUEsQ0FBQ0EsR0FBR0EsR0FBR0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQUE7UUFDdEJBLElBQUlBLENBQUNBLE9BQU9BLEdBQUdBLElBQUlBLENBQUNBLFNBQVNBLENBQUNBLENBQUFBO1FBQzlCQSxJQUFJQSxDQUFDQSxPQUFPQSxHQUFHQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFBQTtRQUM5QkEsSUFBSUEsQ0FBQ0EsWUFBWUEsR0FBR0EsSUFBSUEsQ0FBQ0EsY0FBY0EsQ0FBQ0EsQ0FBQUE7UUFDeENBLEVBQUVBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLE9BQU9BLElBQUlBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBO1lBQzVCQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxxQkFBcUJBLEdBQUdBLElBQUlBLENBQUNBLElBQUlBLENBQUNBLENBQUFBO1lBQzlDQSxPQUFPQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFBQTtZQUM1QkEsTUFBTUEsSUFBSUEsS0FBS0EsQ0FBQ0EsVUFBVUEsR0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQUE7UUFDekNBLENBQUNBO0lBQ0xBLENBQUNBO0lBRURELG9CQUFNQSxHQUFOQTtRQUNJRSxJQUFJQSxLQUFLQSxHQUFRQSxJQUFJQSxDQUFDQSxPQUFPQSxDQUFDQTtRQUM5QkEsSUFBSUEsUUFBUUEsR0FBUUEsSUFBSUEsQ0FBQ0EsZUFBZUEsQ0FBQ0E7UUFDekNBLElBQUlBLEtBQUtBLEdBQVFBLElBQUlBLENBQUNBLFlBQVlBLENBQUNBO1FBQ25DQSxJQUFJQSxHQUFHQSxHQUFHQTtZQUNOQSxJQUFJQSxFQUFFQSxJQUFJQSxDQUFDQSxJQUFJQTtZQUNmQSxLQUFLQSxFQUFFQSxJQUFJQSxDQUFDQSxLQUFLQSxDQUFDQSxFQUFFQTtZQUNwQkEsT0FBT0EsRUFBRUEs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eEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7QUFDbEIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtBQUM3QixFQUFFLENBQUEsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQztJQUNsQixFQUFFLENBQUEsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDMUIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDSixHQUFHLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzVCLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8vIDxyZWZlcmVuY2UgcGF0aD1cInNjcmVlcHMuZC50c1wiIC8+XG5cbmludGVyZmFjZSBQb3NpdGlvbkVudGl0eSB7XG4gICAgcG9zOiBSb29tUG9zaXRpb25cbiAgICBpZDogc3RyaW5nXG4gICAgdHJhbnNmZXJFbmVyZ3koY3JlZXA6IENyZWVwKTogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgU2NyZWVwIGV4dGVuZHMgQ3JlZXAsIFN1cGVyQ3JlZXB7XG4gICAgam9iPyA6IEpvYjtcbn1cblxuY2xhc3MgU3VwZXJDcmVlcCB7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVuZXJneTogbnVtYmVyO1xuICAgIGJvZHk6IHtcblxuICAgICAgICAvKiogT25lIG9mIHRoZSBib2R5IHBhcnRzIGNvbnN0YW50cy4gKi9cbiAgICAgICAgdHlwZTogc3RyaW5nO1xuXG4gICAgICAgIC8qKiBUaGUgcmVtYWluaW5nIGFtb3VudCBvZiBoaXQgcG9pbnRzIG9mIHRoaXMgYm9keSBwYXJ0LiAqL1xuICAgICAgICBoaXRzOiBudW1iZXJcblxuICAgIH1bXTtcblxuICAgIGhvd01hbnlQYXJ0cyhwYXJ0OnN0cmluZyk6bnVtYmVyIHtcbiAgICAgIHJldHVybiB0aGlzLmJvZHkuZmlsdGVyKHMgPT4geyByZXR1cm4gKHMudHlwZSA9PSBwYXJ0ICYmIHMuaGl0cyA+IDApIH0pLmxlbmd0aCBcbiAgICB9XG5cbiAgICBoYXNQYXJ0KHBhcnQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgICAgcmV0dXJuIHRoaXMuaG93TWFueVBhcnRzKHBhcnQpID4gMFxuICAgIH1cblxuICAgIGNhbk1vdmUoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1BhcnQoTU9WRSk7XG4gICAgfVxuXG4gICAgY2FuV29yaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChXT1JLKTtcbiAgICB9XG5cbiAgICBjYW5IZWFsKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KEhFQUwpO1xuICAgIH1cblxuICAgIGNhbkF0dGFjaygpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFzUGFydChBVFRBQ0spO1xuICAgIH1cblxuICAgIGNhblNob290KCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KFJBTkdFRF9BVFRBQ0spO1xuICAgIH1cblxuICAgIGNhbkNsYWltKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5oYXNQYXJ0KENMQUlNKTtcbiAgICB9XG5cbiAgICBsb2coLi4ubXNnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiW1wiK3RoaXMubmFtZStcIl1cIiwgLi4ubXNnKVxuICAgIH1cbn1cblxuXG5cblxuZnVuY3Rpb24gYXBwbHlNaXhpbnMoZGVyaXZlZEN0b3I6IGFueSwgYmFzZUN0b3JzOiBhbnlbXSkge1xuICAgIGJhc2VDdG9ycy5mb3JFYWNoKGJhc2VDdG9yID0+IHtcbiAgICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYmFzZUN0b3IucHJvdG90eXBlKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgICAgICAgICAgZGVyaXZlZEN0b3IucHJvdG90eXBlW25hbWVdID0gYmFzZUN0b3IucHJvdG90eXBlW25hbWVdO1xuICAgICAgICB9KVxuICAgIH0pOyBcbn1cblxuXG5hcHBseU1peGlucyhDcmVlcCwgW1N1cGVyQ3JlZXBdKVxuXG4iLCIvLy8gPHJlZmVyZW5jZSBwYXRoPVwic2NyZWVwcy5kLnRzXCIgLz5cbi8vLyA8cmVmZXJlbmNlIHBhdGg9XCJnbG9iYWxzLnRzXCIgLz5cblxuLy9yZXF1aXJlKCdnbG9iYWxzJylcblxuLy8gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoU3VwZXJDcmVlcC5wcm90b3R5cGUpLmZvckVhY2gobmFtZSA9PiB7XG4vLyAgIENyZWVwLnByb3RvdHlwZVtuYW1lXSA9IFN1cGVyQ3JlZXAucHJvdG90eXBlW25hbWVdXG4vLyB9KVxuXG50eXBlIEpvYkZ1bmMgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpID0+IG51bWJlcjtcbnR5cGUgQ3JlZXBGaWx0ZXIgPSAoY3JlZXA6IFNjcmVlcCkgPT4gYm9vbGVhbjtcbnR5cGUgQ3JlZXBDbXAgPSAoYTogQ3JlZXAsIGI6IFNjcmVlcCkgPT4gbnVtYmVyO1xuXG5cbmNvbnN0IEpPQl9DT01QTEVURSA9IDk5OVxuY29uc3QgRV9DUkFTSCA9IC05OVxuXG5pbnRlcmZhY2UgRW5lcmd5SG9sZGVyIGV4dGVuZHMgU3RydWN0dXJlIHtcbiAgICBlbmVyZ3k6IG51bWJlcjtcbiAgICBlbmVyZ3lDYXBhY2l0eTogbnVtYmVyO1xuICAgIHRyYW5zZmVyRW5lcmd5KGM6IENyZWVwKVxufVxuXG4vLyBUT0RPOiByZS1hZGQgY2FuZGlkYXRlIGZpbHRlclxuLy8gVE9ETzogZmlndXJlIG91dCBiZXR0ZXIgaWRsZSBzaXR1YXRpb25cbi8vIFRPRE86IGRlYWwgd2l0aCBjcmVlcHMgaGF2aW5nIGxlZnRvdmVyIGVuZXJneSwgZml4IGRlbGl2ZXIgam9icywgbWF5YmUgc3dhcCBlbmQgZm9yICdkZXNpcmVkIHNvdXJjZScgb3Igc29tZXN1Y2hcbi8vIFRPRE86IHRha2UgY3JlZXAgbG9jYWxpY3R5IGludG8gYWNjb3VudCB3aGVuIGNvbXBhcmluZ1xuLy8gVE9ETzogdG93ZXIgbG9naWNcbi8vIFRPRE86IGJ1aWxkZXIvIHJlcGFpciBsb2dpY1xuLy8gVE9ETzogcm9hZCBjcmVhdG9yIC0tIGtlZXAgbWFwIG9mIHJvYWQgcG9zaXRpb25zLCBwYXZlIG1vc3QgdHJhdmVsZWQgdW5wYXZlZCBhcmVhXG4vLyBUT0RPIDogbWF4aW1pemUgdXBncmFkaW5nIVxuY2xhc3MgSm9iIHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgc3RhcnQ6IFN0cnVjdHVyZSB8IENvbnN0cnVjdGlvblNpdGUgfCBFbmVyZ3kgfCBQb3NpdGlvbkVudGl0eTtcbiAgICBlbmQ6IFN0cnVjdHVyZSB8IENvbnN0cnVjdGlvblNpdGUgfCBFbmVyZ3kgfCBQb3NpdGlvbkVudGl0eTtcbiAgICBqb2JGdW5jOiBKb2JGdW5jO1xuICAgIGNhbmRpZGF0ZUZpbHRlcjogQ3JlZXBGaWx0ZXI7XG4gICAgY2FuZGlkYXRlQ21wOiBDcmVlcENtcDtcbiAgICBjcmVlcDogU2NyZWVwOyAvLyBTZXQgZHVyaW5nIGV4ZWN1dGlvbmdcbiAgICBib2R5UmVxOiBCb2R5UGFydFtdXG5cbiAgICBjb25zdHJ1Y3RvcihvcHRzID0ge30pIHtcbiAgICAgICAgdGhpcy5uYW1lID0gb3B0c1snbmFtZSddXG5cbiAgICAgICAgdmFyIG5wID0gb3B0c1snbmFtZVByZWZpeCddXG4gICAgICAgIGlmIChucCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmIChNZW1vcnlbXCJqb2JDb3VudHNcIl0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXSA9IHt9O1xuICAgICAgICAgICAgaWYgKE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF0gPSAwO1xuICAgICAgICAgICAgTWVtb3J5W1wiam9iQ291bnRzXCJdW25wXSArPSAxO1xuICAgICAgICAgICAgdGhpcy5uYW1lID0gbnAgKyBcIl9cIiArIE1lbW9yeVtcImpvYkNvdW50c1wiXVtucF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnN0YXJ0ID0gb3B0c1snc3RhcnQnXVxuICAgICAgICB0aGlzLmVuZCA9IG9wdHNbJ2VuZCddXG4gICAgICAgIHRoaXMuam9iRnVuYyA9IG9wdHNbJ2pvYkZ1bmMnXVxuICAgICAgICB0aGlzLmJvZHlSZXEgPSBvcHRzWydib2R5UmVxJ11cbiAgICAgICAgdGhpcy5jYW5kaWRhdGVDbXAgPSBvcHRzWydjYW5kaWRhdGVDbXAnXVxuICAgICAgICBpZiAodGhpcy5ib2R5UmVxID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJCYWQgam9iISEsIG5vIGJvZHkgXCIgKyB0aGlzLm5hbWUpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhvcHRzWydib2R5UmVxJ10pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgam9iPVwiK3RoaXMubmFtZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRvSlNPTigpIHtcbiAgICAgICAgdmFyIGpvYkZuOiBhbnkgPSB0aGlzLmpvYkZ1bmM7XG4gICAgICAgIHZhciBmaWx0ZXJGbjogYW55ID0gdGhpcy5jYW5kaWRhdGVGaWx0ZXI7XG4gICAgICAgIHZhciBjbXBGbjogYW55ID0gdGhpcy5jYW5kaWRhdGVDbXA7XG4gICAgICAgIHZhciByZXQgPSB7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICBzdGFydDogdGhpcy5zdGFydC5pZCxcbiAgICAgICAgICAgIGpvYkZ1bmM6IFJvbGVzUmV2ZXJzZVtqb2JGbl0sXG4gICAgICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFJldmVyc2VbY21wRm5dLFxuICAgICAgICAgICAgYm9keVJlcTogdGhpcy5ib2R5UmVxXG4gICAgICAgIH07XG4gICAgICAgIGlmICh0aGlzLmVuZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldFsnZW5kJ10gPSB0aGlzLmVuZC5pZDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0XG4gICAgfVxufVxuXG52YXIgcGFyc2VKb2IgPSAoazogc3RyaW5nLCB2KTogYW55ID0+IHtcbiAgICBzd2l0Y2ggKGspIHtcbiAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICBjYXNlICdlbmQnOlxuICAgICAgICAgICAgdmFyIHIgPSBHYW1lLmdldE9iamVjdEJ5SWQodilcbiAgICAgICAgICAgIGlmIChyID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRkFJTEVEIFRPIExPQUQgXCIgKyBrICsgXCIgZnJvbSBcIiArIHYpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcjtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdqb2JGdW5jJzpcbiAgICAgICAgICAgIHJldHVybiBSb2xlc1t2XTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjYW5kaWRhdGVDbXAnOlxuICAgICAgICAgICAgcmV0dXJuIENtcFt2XTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcnOlxuICAgICAgICAgICAgcmV0dXJuIHYubWFwKG89PiB7IHJldHVybiBuZXcgSm9iKG8pIH0pXG4gICAgfVxuICAgIHJldHVybiB2XG59XG5cbnZhciBzZXRKb2IgPSAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpID0+IHtcbiAgICBNZW1vcnlbJ2pvYl93b3JrZXJzJ11bam9iLm5hbWVdID0gY3JlZXAubmFtZTtcbiAgICBqb2IuY3JlZXAgPSBjcmVlcDtcbiAgICBjcmVlcC5qb2IgPSBqb2I7XG59XG5cbnZhciBjbGVhckpvYiA9IChjcmVlcDogU2NyZWVwLCBqb2I6IEpvYikgPT4ge1xuICAgIGRlbGV0ZSBNZW1vcnlbJ2pvYl93b3JrZXJzJ11bam9iLm5hbWVdO1xuICAgIGRlbGV0ZSBqb2IuY3JlZXBcbiAgICBkZWxldGUgY3JlZXAuam9iXG59XG5cbnZhciBnZXRNeVN0cnVjdHVyZXNJbkFsbFJvb21zID0gKHN0cnVjdFR5cGVzOiBzdHJpbmdbXSk6IFN0cnVjdHVyZVtdID0+IHtcbiAgICB2YXIgc3RydWN0cyA9IFtdXG4gICAgZm9yICh2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgc3RydWN0cy5wdXNoLmFwcGx5KGdldE15U3RydWN0dXJlc0luUm9vbShyb29tTmFtZSwgc3RydWN0VHlwZXMpKVxuICAgIH1cbiAgICByZXR1cm4gc3RydWN0cztcbn1cblxudmFyIG5lZWRzRW5lcmd5ID0gKHM6IFN0cnVjdHVyZSk6IGJvb2xlYW4gPT4ge1xuICAgIHN3aXRjaCAocy5zdHJ1Y3R1cmVUeXBlKSB7XG4gICAgICAgIGNhc2UgU1RSVUNUVVJFX1NUT1JBR0U6XG4gICAgICAgICAgICByZXR1cm4gKDxTdG9yYWdlPnMpLnN0b3JlLmVuZXJneSA8ICg8U3RvcmFnZT5zKS5zdG9yZUNhcGFjaXR5O1xuICAgICAgICBjYXNlIFNUUlVDVFVSRV9UT1dFUjpcbiAgICAgICAgICAgIHJldHVybiAoPFRvd2VyPnMpLmVuZXJneSA8ICg8VG93ZXI+cykuZW5lcmd5Q2FwYWNpdHkgKiAuNzVcbiAgICAgICAgY2FzZSBTVFJVQ1RVUkVfU1BBV04sIFNUUlVDVFVSRV9FWFRFTlNJT04sIFNUUlVDVFVSRV9MSU5LLCBTVFJVQ1RVUkVfUE9XRVJfU1BBV046XG4gICAgICAgICAgICByZXR1cm4gKDxFbmVyZ3lIb2xkZXI+cykuZW5lcmd5IDwgKDxFbmVyZ3lIb2xkZXI+cykuZW5lcmd5Q2FwYWNpdHlcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBnZXRNeVN0cnVjdHVyZXNJblJvb20gPSAocm9vbU5hbWU6IHN0cmluZywgc3RydWN0VHlwZXM6IHN0cmluZ1tdKTogU3RydWN0dXJlW10gPT4ge1xuICAgIHZhciByb29tOiBSb29tID0gR2FtZS5yb29tc1tyb29tTmFtZV1cbiAgICBpZiAocm9vbSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gVE9ETzogTG9nP1xuICAgICAgICBjb25zb2xlLmxvZyhcIkNhbid0IGZpbmQgcm9vbSBcIiArIHJvb21OYW1lKVxuICAgICAgICByZXR1cm4gW11cbiAgICB9XG4gICAgaWYgKHJvb21bXCJteV9zdHJ1Y3R1cmVzXCJdID09IHVuZGVmaW5lZCkge1xuICAgICAgICByb29tW1wibXlfc3RydWN0dXJlc1wiXSA9IHJvb20uZmluZChGSU5EX01ZX1NUUlVDVFVSRVMpXG4gICAgfVxuICAgIHJldHVybiByb29tW1wibXlfc3RydWN0dXJlc1wiXS5maWx0ZXIocz0+IHsgcmV0dXJuIHN0cnVjdFR5cGVzLmluZGV4T2Yocy5zdHJ1Y3R1cmVUeXBlKSA+IC0xIH0pXG59XG5cbnZhciBmaW5kTmVhcmVzdFN0b3JhZ2UgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IFN0cnVjdHVyZSA9PiB7XG4gICAgdmFyIHN0b3JlcyA9IGdldE15U3RydWN0dXJlc0luUm9vbSh0YXJnZXQucG9zLnJvb21OYW1lLCBbU1RSVUNUVVJFX1NUT1JBR0VdKS5maWx0ZXIobmVlZHNFbmVyZ3kpXG4gICAgaWYgKHN0b3Jlcy5sZW5ndGggPT0gMClcbiAgICAgICAgc3RvcmVzID0gZ2V0TXlTdHJ1Y3R1cmVzSW5Sb29tKHRhcmdldC5wb3Mucm9vbU5hbWUsIFtTVFJVQ1RVUkVfVE9XRVJdKS5maWx0ZXIobmVlZHNFbmVyZ3kpXG4gICAgaWYgKHN0b3Jlcy5sZW5ndGggPT0gMClcbiAgICAgICAgc3RvcmVzID0gZ2V0TXlTdHJ1Y3R1cmVzSW5BbGxSb29tcyhbU1RSVUNUVVJFX1NUT1JBR0VdKS5maWx0ZXIobmVlZHNFbmVyZ3kpXG4gICAgaWYgKHN0b3Jlcy5sZW5ndGggPT0gMClcbiAgICAgICAgc3RvcmVzID0gZ2V0TXlTdHJ1Y3R1cmVzSW5BbGxSb29tcyhbU1RSVUNUVVJFX1NQQVdOXSkuZmlsdGVyKG5lZWRzRW5lcmd5KVxuICAgIHJldHVybiB0YXJnZXQucG9zLmZpbmRDbG9zZXN0QnlSYW5nZShzdG9yZXMpXG59XG5cbnZhciBjcmVhdGVQaWNrdXBKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAnY2FycnknLFxuICAgICAgICBzdGFydDogdGFyZ2V0LFxuICAgICAgICBlbmQ6IGZpbmROZWFyZXN0U3RvcmFnZSh0YXJnZXQpLFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVGaWxsSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2ZpbGwnLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGVuZDogdGFyZ2V0LFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVEZWxpdmVySm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ2RlbGl2ZXInLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGpvYkZ1bmM6IFJvbGVzWydkZWxpdmVyJ10sXG4gICAgICAgIGJvZHlSZXE6IFtNT1ZFLCBDQVJSWSwgQ0FSUlldLFxuICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFsnbm9vcCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVCdWlsZEpvYiA9ICh0YXJnZXQ6IFBvc2l0aW9uRW50aXR5KTogSm9iID0+IHtcbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWVQcmVmaXg6ICd1cGdyYWRlJyxcbiAgICAgICAgc3RhcnQ6IGZpbmROZWFyZXN0U3RvcmFnZSh0YXJnZXQpLFxuICAgICAgICBlbmQ6IHRhcmdldCxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ2NhcnJ5J10sXG4gICAgICAgIGJvZHlSZXE6IFtNT1ZFLCBXT1JLLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVVcGdyYWRlSm9iID0gKHRhcmdldDogUG9zaXRpb25FbnRpdHkpOiBKb2IgPT4ge1xuICAgIHJldHVybiBuZXcgSm9iKHtcbiAgICAgICAgbmFtZVByZWZpeDogJ3VwZ3JhZGUnLFxuICAgICAgICBzdGFydDogZmluZE5lYXJlc3RTdG9yYWdlKHRhcmdldCksXG4gICAgICAgIGVuZDogdGFyZ2V0LFxuICAgICAgICBqb2JGdW5jOiBSb2xlc1snY2FycnknXSxcbiAgICAgICAgYm9keVJlcTogW01PVkUsIE1PVkUsIE1PVkUsIFdPUkssIFdPUkssIFdPUkssIFdPUkssIENBUlJZLCBDQVJSWV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWydjYXJyaWVzVGhlTW9zdCddLFxuICAgIH0pXG59XG5cbnZhciBjcmVhdGVSZXBhaXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG4gICAgcmV0dXJuIG5ldyBKb2Ioe1xuICAgICAgICBuYW1lUHJlZml4OiAncmVwYWlyJyxcbiAgICAgICAgc3RhcnQ6IHRhcmdldCxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ3JlcGFpciddLFxuICAgICAgICBib2R5UmVxOiBbTU9WRSwgV09SSywgQ0FSUlldLFxuICAgICAgICBjYW5kaWRhdGVDbXA6IENtcFsnY2Fycmllc1RoZU1vc3QnXSxcbiAgICB9KVxufVxuXG52YXIgY3JlYXRlTWluZXJKb2IgPSAodGFyZ2V0OiBQb3NpdGlvbkVudGl0eSk6IEpvYiA9PiB7XG5cbiAgICByZXR1cm4gbmV3IEpvYih7XG4gICAgICAgIG5hbWU6IFwibWluZXJcIixcbiAgICAgICAgc3RhcnQ6IHRhcmdldCxcbiAgICAgICAgam9iRnVuYzogUm9sZXNbJ21lZ2FNaW5lciddLFxuICAgICAgICBib2R5UmVxOiBbV09SSywgV09SSywgTU9WRV0sXG4gICAgICAgIGNhbmRpZGF0ZUNtcDogQ21wWyd3b3Jrc0hhcmQnXSxcbiAgICB9KVxufVxuXG5cbnZhciBuZWVkc1JlcGFpciA9IChzOlN0cnVjdHVyZSk6Ym9vbGVhbiA9PiB7XG4gICAgaWYgKHMuc3RydWN0dXJlVHlwZSA9PSBTVFJVQ1RVUkVfV0FMTCkge1xuICAgICAgICByZXR1cm4gcy5oaXRzIDwgTWF0aC5taW4ocy5oaXRzTWF4LCA1MDAwMClcbiAgICB9XG4gICAgaWYgKHMuc3RydWN0dXJlVHlwZSA9PSBTVFJVQ1RVUkVfUkFNUEFSVCkge1xuICAgICAgICByZXR1cm4gcy5oaXRzIDwgTWF0aC5taW4ocy5oaXRzTWF4LCAxMDAwMClcbiAgICB9XG4gICAgcmV0dXJuIHMuaGl0cyA8IHMuaGl0c01heFxufVxuXG52YXIgcm9vbUNvbnRyb2xsZWRCeU1lID0gKHJvb206Um9vbSk6Ym9vbGVhbiA9PiB7XG4gICAgaWYgKHJvb20gPT0gdW5kZWZpbmVkIHx8IHJvb20uY29udHJvbGxlciA9PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZVxuXG4gICAgaWYgKHJvb20uY29udHJvbGxlci5vd25lciAhPSB1bmRlZmluZWQgJiYgcm9vbS5jb250cm9sbGVyLm93bmVyLnVzZXJuYW1lID09ICdvbWdiZWFyJykge1xuICAgICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgICBpZiAocm9vbS5jb250cm9sbGVyLnJlc2VydmF0aW9uICE9IHVuZGVmaW5lZCAmJiByb29tLmNvbnRyb2xsZXIucmVzZXJ2YXRpb24udXNlcm5hbWUgPT0gJ29tZ2JlYXInKSB7XG4gICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlXG59XG5cbnZhciBvd25lZEJ5TWUgPSAoc3RydWN0OlN0cnVjdHVyZSk6IGJvb2xlYW4gPT4ge1xuICAgaWYgKHN0cnVjdC5vd25lciAmJiBzdHJ1Y3Qub3duZXIudXNlcm5hbWUgPT0gJ29tZ2JlYXInKXtcbiAgICAgICByZXR1cm4gdHJ1ZVxuICAgfVxuICAgcmV0dXJuIHJvb21Db250cm9sbGVkQnlNZShzdHJ1Y3Qucm9vbSlcbn1cblxuXG5jb25zdCBUQVJHRVRfU0NPUkVfSEVBTCA9IDVcbmNvbnN0IFRBUkdFVF9TQ09SRV9BVFRBQ0sgPSAwXG5jb25zdCBUQVJHRVRfU0NPUkVfU0hPT1QgPSAzXG5cbnZhciBzY29yZVRhcmdldCA9IChzcmM6IFNjcmVlcCB8IFRvd2VyLCB0YXJnZXQ6IFNjcmVlcCkgPT4ge1xuICAgIHZhciBzY29yZSA9IHNyYy5wb3MuZ2V0UmFuZ2VUbyh0YXJnZXQpXG4gICAgc2NvcmUgKz0gdGFyZ2V0Lmhvd01hbnlQYXJ0cyhIRUFMKSAqIFRBUkdFVF9TQ09SRV9IRUFMXG4gICAgc2NvcmUgKz0gdGFyZ2V0Lmhvd01hbnlQYXJ0cyhBVFRBQ0spICogVEFSR0VUX1NDT1JFX0FUVEFDS1xuICAgIHNjb3JlICs9IHRhcmdldC5ob3dNYW55UGFydHMoUkFOR0VEX0FUVEFDSykgKiBUQVJHRVRfU0NPUkVfU0hPT1RcbiAgICByZXR1cm4gc2NvcmVcbn1cblxuLy8gVE9ETzogQVBJIHRvIGFkZCBqb2JzLCBzb21lIHdheSB0byBjb21iaW5lIGluLW1lbW9yeSBqb2JzIHdpdGggaW4tY29kZSBqb2JzXG4vLyBmaXRuZXNzIGZ1bmMgZm9yIGNhbmRpZGF0ZXMgYmFzZWQgb24gZGlzdGFuY2UuXG52YXIgcnVuQWxsSm9icyA9IChqb2JzOiBKb2JbXSkgPT4ge1xuXG4gICAgdmFyIGFkZEpvYiA9IChqb2I6IEpvYikgPT4ge1xuICAgICAgICBqb2JzLnB1c2goam9iKVxuICAgIH1cblxuICAgIHZhciByZW1vdmVKb2IgPSAoam9iOiBKb2IpID0+IHtcbiAgICAgICAgdmFyIGlkeCA9IGpvYnMuaW5kZXhPZihqb2IpXG4gICAgICAgIGlmIChpZHggPCAwKSByZXR1cm5cbiAgICAgICAgam9icy5zcGxpY2UoaWR4LCAxKVxuICAgIH1cblxuICAgIGlmIChNZW1vcnlbJ2pvYl93b3JrZXJzJ10gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwicmVwbGFjaW5nIHdvcmtlciBtYXAxISFcIilcbiAgICAgICAgTWVtb3J5Wydqb2Jfd29ya2VycyddID0ge31cbiAgICB9XG4gICAgdmFyIGNyZWVwczogU2NyZWVwW10gPSBbXVxuICAgIGZvciAodmFyIG4gb2YgT2JqZWN0LmtleXMoR2FtZS5jcmVlcHMpKSB7XG4gICAgICAgIGlmIChHYW1lLmNyZWVwc1tuXS5zcGF3bmluZykgY29udGludWU7XG4gICAgICAgIGNyZWVwcy5wdXNoKEdhbWUuY3JlZXBzW25dKVxuICAgIH1cblxuICAgIHZhciBzZWVuSm9iczogeyBbaW5kZXg6IHN0cmluZ106IGJvb2xlYW4gfSA9IHt9XG5cblxuICAgIGZvciAodmFyIGpvYiBvZiBqb2JzKSB7XG4gICAgICAgIC8vIGNoZWNrIGlmIHN0aWxsIHZhbGlkXG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIER1cGVcbiAgICAgICAgaWYgKHNlZW5Kb2JzW2pvYi5uYW1lXSkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJEVVBMSUNBVEUgSk9CIElOIExJU1QhISBcIiArIGpvYi5uYW1lKVxuICAgICAgICB9XG4gICAgICAgIHNlZW5Kb2JzW2pvYi5uYW1lXSA9IHRydWVcblxuICAgICAgICB2YXIgY3JlZXBOYW1lOiBzdHJpbmcgPSBNZW1vcnlbJ2pvYl93b3JrZXJzJ11bam9iLm5hbWVdO1xuICAgICAgICB2YXIgY3JlZXA6IFNjcmVlcCA9IHVuZGVmaW5lZDtcbiAgICAgICAgY29uc29sZS5sb2coam9iLm5hbWUsIGNyZWVwTmFtZSwgam9iLnN0YXJ0KVxuICAgICAgICBpZiAoY3JlZXBOYW1lICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY3JlZXAgPSBHYW1lLmNyZWVwc1tjcmVlcE5hbWVdXG4gICAgICAgICAgICBpZiAoam9iLnN0YXJ0ID09IHVuZGVmaW5lZCB8fCBqb2Iuc3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3RhcnQgZGlzYXBwZWFyZWQgZm9yIFwiICsgam9iLm5hbWUpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGpvYilcbiAgICAgICAgICAgICAgICBpZiAoY3JlZXAgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsZWFySm9iKGNyZWVwLCBqb2IpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoam9iLnN0YXJ0ID09IHVuZGVmaW5lZCB8fCBqb2Iuc3RhcnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3RhcnQgZGlzYXBwZWFyZWQgZm9yIFwiICsgam9iLm5hbWUpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGpvYilcbiAgICAgICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChjcmVlcCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBNZW1vcnlbJ2pvYl93b3JrZXJzJ11bam9iLm5hbWVdO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJzZXR0aW5nIFwiICsgY3JlZXAubmFtZSArIFwiIHRvIGRvIFwiICsgam9iLm5hbWUpXG4gICAgICAgICAgICBzZXRKb2IoY3JlZXAsIGpvYik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBKb2IgY3JlYXRvcnNcblxuICAgIC8vIEdhdGhlciBkcm9wcGVkIHJlc291cmNlc1xuICAgIHZhciBHQVRIRVJfVEhSRVNIT0xEID0gMjAwIC8vIFRPRE86IFNldCBiYXNlZCBvbiBhdmFpbGFibGUgY3JlZXBzXG4gICAgZm9yICh2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgdmFyIHJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXVxuICAgICAgICB2YXIgcmVzb3VyY2VzID0gcm9vbS5maW5kKEZJTkRfRFJPUFBFRF9SRVNPVVJDRVMpXG4gICAgICAgIHZhciByZXNvdXJjZXNCeUlkOiB7IFtpbmRleDogc3RyaW5nXTogbnVtYmVyIH0gPSB7fVxuICAgICAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCA9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coam9iLm5hbWUsIGpvYi5zdGFydClcbiAgICAgICAgICAgIGlmICgoPFJlc291cmNlPmpvYi5zdGFydCkucmVzb3VyY2VUeXBlID09IFJFU09VUkNFX0VORVJHWSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNvdXJjZXNCeUlkW2pvYi5zdGFydC5pZF0gPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGpvYi5uYW1lLCBqb2IuY3JlZXApXG4gICAgICAgICAgICAgICAgaWYgKGpvYi5jcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzQnlJZFtqb2Iuc3RhcnQuaWRdICs9IChqb2IuY3JlZXAuY2FycnlDYXBhY2l0eSAtIGpvYi5jcmVlcC5jYXJyeS5lbmVyZ3kpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgd2FudCBvbmUgZW1wdHkgam9iIHBlciByZXNvdXJjZSwgZGVmYXVsdCB0byBpbmZpbml0eSBpZiB0aGVyZSBhcmUgbm8gY3JlZXBzXG4gICAgICAgICAgICAgICAgICAgIHJlc291cmNlc0J5SWRbam9iLnN0YXJ0LmlkXSArPSA5OTlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHZhciByZXNvdXJjZSBvZiByZXNvdXJjZXMpIHtcbiAgICAgICAgICAgIHZhciBjdXJyZW50bHlBbGxvY2F0ZWRDYXBhY2l0eSA9IHJlc291cmNlc0J5SWRbcmVzb3VyY2UuaWRdIHx8IDA7XG4gICAgICAgICAgICBpZiAoKHJlc291cmNlLmFtb3VudCAtIGN1cnJlbnRseUFsbG9jYXRlZENhcGFjaXR5KSA+IEdBVEhFUl9USFJFU0hPTEQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIk5ldyBwaWNrdXAgam9iXCIpXG4gICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVBpY2t1cEpvYihyZXNvdXJjZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgdGFyZ2V0QXR0YWN0aXZlbmVzc0NtcCA9ICh0b3dlcjpUb3dlcnxTY3JlZXApICA9PiB7XG4gICAgICAgIHJldHVybiAoYTpTY3JlZXAsYjpTY3JlZXApOm51bWJlciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc2NvcmVUYXJnZXQodG93ZXIsIGEpIC0gc2NvcmVUYXJnZXQodG93ZXIsYilcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBydW5Ub3dlciA9ICh0b3dlcikgPT4ge1xuICAgICAgICAvLyBGaW5kIHN0cnVjdHVyZXMsIHNvcnQgYnkgcHJpb3JpdHk/XG4gICAgICAgIC8vIEV2ZW50dWFsbHkgdG93ZXIgY2FuIGNvbnN1bWUgam9iczo/IG9yIGFsd2F5cyBzZXBhcmF0ZVxuICAgICAgICAvLyBUT0RPOiBidWlsZGluZ3Mvcm9hZHMvcmFtcGFydHMvd2FsbHNcbiAgICAgICAgdmFyIGVuZW1pZXMgPSB0b3dlci5yb29tLmZpbmQoRklORF9IT1NUSUxFX0NSRUVQUylcbiAgICAgICAgaWYgKGVuZW1pZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZW5lbWllcy5zb3J0KHRhcmdldEF0dGFjdGl2ZW5lc3NDbXAodG93ZXIpKVxuICAgICAgICAgICAgdG93ZXIuYXR0YWNrKGVuZW1pZXNbMF0pXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdHJ1Y3R1cmVzID0gdG93ZXIucm9vbS5maW5kKEZJTkRfU1RSVUNUVVJFUylcbiAgICAgICAgc3RydWN0dXJlcy5zb3J0KChhLCBiKSA9PiB7IHJldHVybiBhLmhpdHMgLSBiLmhpdHMgfSlcbiAgICAgICAgZm9yICh2YXIgcyBvZiBzdHJ1Y3R1cmVzKSB7XG4gICAgICAgICAgICBpZiAobmVlZHNSZXBhaXIocykpIHtcbiAgICAgICAgICAgICAgICAgdG93ZXIucmVwYWlyKHMpXG4gICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFID0gW1NUUlVDVFVSRV9TUEFXTiwgU1RSVUNUVVJFX0VYVEVOU0lPTiwgU1RSVUNUVVJFX1RPV0VSLCBTVFJVQ1RVUkVfQ09OVFJPTExFUl1cbiAgICB2YXIgc3RydWN0dXJlcyA9IHt9XG4gICAgZm9yICh2YXIgcm9vbU5hbWUgb2YgT2JqZWN0LmtleXMoR2FtZS5yb29tcykpIHtcbiAgICAgICAgdmFyIHJvb20gPSBHYW1lLnJvb21zW3Jvb21OYW1lXTtcbiAgICAgICAgdmFyIHJvb21TdHJ1Y3R1cmVzID0gcm9vbS5maW5kKEZJTkRfU1RSVUNUVVJFUylcbiAgICAgICAgZm9yICh2YXIgc3RydWN0VHlwZSBvZiBTVFJVQ1RVUkVTX1RPX0lOVkVTVElHQVRFKSB7XG4gICAgICAgICAgICBzdHJ1Y3R1cmVzW3N0cnVjdFR5cGVdID0gKHN0cnVjdHVyZXNbc3RydWN0VHlwZV0gfHwgW10pLmNvbmNhdChyb29tU3RydWN0dXJlcy5maWx0ZXIocz0+IHsgcmV0dXJuIHMuc3RydWN0dXJlVHlwZSA9PSBzdHJ1Y3RUeXBlIH0pKVxuICAgICAgICB9XG4gICAgICAgIGlmIChyb29tQ29udHJvbGxlZEJ5TWUocm9vbSkpIHtcbiAgICAgICAgICAgIGZvciAodmFyIHNvdXJjZSBvZiByb29tLmZpbmQoRklORF9TT1VSQ0VTKSkge1xuICAgICAgICAgICAgICAgIGlmIChqb2JzLmZpbHRlcigoam9iOiBKb2IpOmJvb2xlYW4gPT4geyByZXR1cm4gam9iLmpvYkZ1bmMgPT0gUm9sZXNbJ21lZ2FNaW5lciddICYmIGpvYi5zdGFydCAmJiBqb2Iuc3RhcnQuaWQgPT0gc291cmNlLmlkIH0pLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVNaW5lckpvYihzb3VyY2UpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBzdHJ1Y3RUeXBlIG9mIFNUUlVDVFVSRVNfVE9fSU5WRVNUSUdBVEUpIHtcbiAgICAgICAgZm9yICh2YXIgc3RydWN0IG9mIHN0cnVjdHVyZXNbc3RydWN0VHlwZV0pIHtcbiAgICAgICAgICAgIGlmIChzdHJ1Y3Qub3duZXIgJiYgc3RydWN0Lm93bmVyLnVzZXJuYW1lICE9ICdvbWdiZWFyJykgY29udGludWU7XG4gICAgICAgICAgICB2YXIgam9ic0ZvclN0cnVjdCA9IFtdXG4gICAgICAgICAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAgICAgICAgIGlmIChqb2Iuc3RhcnQgJiYgam9iLnN0YXJ0LmlkID09IHN0cnVjdC5pZCB8fCAoam9iLmVuZCAmJiBqb2IuZW5kLmlkID09IHN0cnVjdC5pZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgam9ic0ZvclN0cnVjdC5wdXNoKGpvYilcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgd2UgbmVlZCBuZXcgam9icyBub3dcbiAgICAgICAgICAgIHN3aXRjaCAoc3RydWN0VHlwZSkge1xuICAgICAgICAgICAgICAgIGNhc2UgU1RSVUNUVVJFX1RPV0VSOlxuICAgICAgICAgICAgICAgICAgICBydW5Ub3dlcihzdHJ1Y3QpXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJ1Y3QuZW5lcmd5IDwgc3RydWN0LmVuZXJneUNhcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoam9ic0ZvclN0cnVjdC5sZW5ndGggPCAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZUZpbGxKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9TUEFXTjpcbiAgICAgICAgICAgICAgICBjYXNlIFNUUlVDVFVSRV9FWFRFTlNJT046XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdHJ1Y3QuZW5lcmd5IDwgc3RydWN0LmVuZXJneUNhcGFjaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoam9ic0ZvclN0cnVjdC5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVGaWxsSm9iKHN0cnVjdCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBTVFJVQ1RVUkVfQ09OVFJPTExFUjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0cnVjdC5sZXZlbCA8IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqb2JzRm9yU3RydWN0Lmxlbmd0aCA8PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVVwZ3JhZGVKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqb2JzRm9yU3RydWN0Lmxlbmd0aCA8PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSm9iKGNyZWF0ZVVwZ3JhZGVKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBzdHJ1Y3Qgb2Ygcm9vbVN0cnVjdHVyZXMpIHtcbiAgICAgICAgaWYgKG93bmVkQnlNZShzdHJ1Y3QpICYmIG5lZWRzUmVwYWlyKHN0cnVjdCkpIHtcbiAgICAgICAgICAgIHZhciBqb2JFeGlzdHM6Ym9vbGVhbiA9IGZhbHNlXG4gICAgICAgICAgICBmb3IgKHZhciBqIG9mIGpvYnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoai5qb2JGdW5jID09IFJvbGVzWydyZXBhaXInXSAmJiBqLnN0YXJ0LmlkID09IHN0cnVjdC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBqb2JFeGlzdHMgPSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChqb2JFeGlzdHMpIGJyZWFrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWpvYkV4aXN0cykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUmVwYWlyIHNpdGU6IFwiICsgc3RydWN0LmlkKVxuICAgICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVSZXBhaXJKb2Ioc3RydWN0KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgcm9vbVNpdGVzID0gcm9vbS5maW5kKEZJTkRfTVlfQ09OU1RSVUNUSU9OX1NJVEVTKVxuICAgIGZvciAodmFyIHNpdGUgb2Ygcm9vbVNpdGVzKSB7XG4gICAgICAgIHZhciBqb2JzRm9yU2l0ZTogSm9iW10gPSBbXVxuICAgICAgICBmb3IgKHZhciBqb2Igb2Ygam9icykge1xuICAgICAgICAgICAgaWYgKGpvYi5zdGFydCAmJiBqb2Iuc3RhcnQuaWQgPT0gc3RydWN0LmlkIHx8IChqb2IuZW5kICYmIGpvYi5lbmQuaWQgPT0gc3RydWN0LmlkKSkge1xuICAgICAgICAgICAgICAgIGpvYnNGb3JTaXRlLnB1c2goam9iKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gdG9kbyBvbmx5IHJlcGFpciB3YWxscyBpbiBteXJvb21zXG4gICAgICAgIC8vIHRyYWNrIGJ1aWxkcmVycyBvbiBhbGwgc2l0ZXMgLS0gbWF5YmUgYSBjb25zdHJ1Y3Rpb24gZm9yZW1hbiBzbyB3ZSBkb250IHNwYXduIHRvbnMgb2Ygam9icyBhbmRcbiAgICAgICAgY29uc3QgQlVJTERFUlNfUEVSX1NJVEUgPSAyXG4gICAgICAgIGlmIChqb2JzRm9yU2l0ZS5sZW5ndGggPCBCVUlMREVSU19QRVJfU0lURSkge1xuICAgICAgICAgICAgIGFkZEpvYihjcmVhdGVCdWlsZEpvYihzaXRlKSlcbiAgICAgICAgfVxuICAgIH1cblxuXG4gXG5cbiAgICAvLyBNaW5lIGFsbCBzb3VyY2VzXG4gICAgLy8gRmluZCBhbGwgc291cmNlcyBpbiByb29tcywgbWFrZSBzdXJlIHRoZXJlIGlzIGEgam9iIHRvIG1pbmUgZWFjaFxuXG4gICAgLy8gQnVpbGQgdGhpbmdzXG4gICAgLy8gUmVwYWlyIHRoaW5nc1xuICAgIC8vIGV0Yy5cblxuICAgIC8vIERlZmVuZCwgYXR0YWNrLCBldGMuXG5cbiAgICAvLyBBbGxvY2F0ZSBqb2JzXG5cblxuICAgIHZhciBub0pvYiA9IChjOiBTY3JlZXApOiBib29sZWFuID0+IHtcbiAgICAgICAgcmV0dXJuIGMuam9iID09IHVuZGVmaW5lZCB8fCBjLmpvYiA9PSBudWxsXG4gICAgfVxuXG4gICAgdmFyIGdldENhbmRpZGF0ZUZpbHRlciA9IChib2R5UmVxOiBCb2R5UGFydFtdKTogQ3JlZXBGaWx0ZXIgPT4ge1xuICAgICAgICB2YXIgYnIgPSBib2R5UmVxLnNsaWNlKDApXG4gICAgICAgIHJldHVybiAoY3JlZXA6IENyZWVwKTogYm9vbGVhbiA9PiB7XG4gICAgICAgICAgICBmb3IgKHZhciBuZWVkZWRQYXJ0IG9mIGJyKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZvdW5kID0gZmFsc2VcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBib2R5UGFydCBvZiBjcmVlcC5ib2R5KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChib2R5UGFydC50eXBlID09IG5lZWRlZFBhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kKSByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9rIHRvIGFzc2lnbiBcIiAgKyBKU09OLnN0cmluZ2lmeShjcmVlcC5ib2R5KSArIFwiIHRvIFwiKyBib2R5UmVxKVxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgZmluZFN1aXRhYmxlQ3JlZXAgPSAoam9iOiBKb2IpOiBTY3JlZXAgPT4ge1xuICAgICAgICB2YXIgY2FuZGlkYXRlczogU2NyZWVwW10gPSBjcmVlcHMuZmlsdGVyKG5vSm9iKS5maWx0ZXIoZ2V0Q2FuZGlkYXRlRmlsdGVyKGpvYi5ib2R5UmVxKSkuc29ydChqb2IuY2FuZGlkYXRlQ21wKVxuICAgICAgICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlc1swXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgfVxuICAgIHZhciBuZWVkZWRDcmVlcHM6IEJvZHlQYXJ0W11bXSA9IFtdXG4gICAgZm9yICh2YXIgam9iIG9mIGpvYnMpIHtcbiAgICAgICAgaWYgKGpvYi5jcmVlcCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vcGljayBuZXcgb25lXG4gICAgICAgIGNvbnNvbGUubG9nKFwiTmVlZCB0byByZXBsYWNlIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSlcbiAgICAgICAgLy8gVE9ETyBmaWd1cmUgb3V0IGN1cnJ5aW5nIHRvIHBhc3Mgam9iIGludG8gY21wIGZ1bmN0aW9uXG4gICAgICAgIHZhciBjcmVlcCA9IGZpbmRTdWl0YWJsZUNyZWVwKGpvYilcbiAgICAgICAgaWYgKGNyZWVwICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGlja2VkIGNyZWVwIGZvciBqb2IgXCIgKyBqb2IubmFtZSArIFwiIGdvdCBcIiArIGNyZWVwLm5hbWUpO1xuICAgICAgICAgICAgc2V0Sm9iKGNyZWVwLCBqb2IpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJubyBjYW5kaWRhdGVzIGZvciBqb2I9XCIgKyBqb2IubmFtZSArIFwiICBcIiArIGpvYi5ib2R5UmVxKVxuICAgICAgICAgICAgbmVlZGVkQ3JlZXBzLnB1c2goam9iLmJvZHlSZXEpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcnVuSm9iID0gKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgdmFyIHJldFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmV0ID0gY3JlZXAuam9iLmpvYkZ1bmMoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ3Jhc2ggcnVubmluZyBqb2IgXCIgKyBjcmVlcC5qb2IubmFtZSArIFwiIGFuZCBtc2cgXCIgKyBleClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxuICAgICAgICAgICAgcmV0ID0gRV9DUkFTSFxuICAgICAgICB9XG4gICAgICAgIHN3aXRjaCAocmV0KSB7XG4gICAgICAgICAgICBjYXNlIEpPQl9DT01QTEVURTpcbiAgICAgICAgICAgICAgICBjcmVlcC5sb2coXCJKb2IgY29tcGxldGUhXCIpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBFX0NSQVNIOlxuICAgICAgICAgICAgY2FzZSBFUlJfTk9UX0ZPVU5EOlxuICAgICAgICAgICAgY2FzZSBFUlJfSU5WQUxJRF9UQVJHRVQ6XG4gICAgICAgICAgICBjYXNlIEVSUl9GVUxMOlxuICAgICAgICAgICAgY2FzZSBFUlJfSU5WQUxJRF9BUkdTOlxuICAgICAgICAgICAgY2FzZSBFUlJfTk9UX09XTkVSOlxuICAgICAgICAgICAgICAgIGNyZWVwLmxvZyhcIkpvYiBGYWlsZWQhISBlcnI9XCIgKyByZXQpXG4gICAgICAgICAgICAgICAgcmVtb3ZlSm9iKGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjbGVhckpvYihjcmVlcCwgY3JlZXAuam9iKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXRcbiAgICB9XG5cbiAgICBqb2IgPSBudWxsXG4gICAgZm9yICh2YXIgY3JlZXAgb2YgY3JlZXBzKSB7XG4gICAgICAgIGlmIChjcmVlcC5zcGF3bmluZykgY29udGludWU7XG4gICAgICAgIGlmIChjcmVlcC5qb2IgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjcmVlcC5sb2coXCJqb2I9XCIgKyBjcmVlcC5qb2IubmFtZSlcbiAgICAgICAgICAgIGlmIChjcmVlcC5qb2Iuc3RhcnQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETzogQ2xlYW51cFxuICAgICAgICAgICAgICAgIHJlbW92ZUpvYihjcmVlcC5qb2IpXG4gICAgICAgICAgICAgICAgY2xlYXJKb2IoY3JlZXAsIGNyZWVwLmpvYilcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJ1bkpvYihjcmVlcCwgam9iKVxuICAgICAgICAvLyB9IGVsc2UgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA+IDApIHtcbiAgICAgICAgLy8gICAgIHZhciBqID0gY3JlYXRlRGVsaXZlckpvYihjcmVlcClcbiAgICAgICAgLy8gICAgIGFkZEpvYihqKVxuICAgICAgICAvLyAgICAgc2V0Sm9iKGNyZWVwLCBqKVxuICAgICAgICAvLyAgICAgcnVuSm9iKGNyZWVwLCBqKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy9jcmVlcC5sb2coXCJOb3RoaW5nIHRvIGRvXCIpXG4gICAgICAgICAgICAvLyBUT0RPOiBDb3VudCAjIG9mIGlkbGUgYm90cywgZXZlbnR1YWxseSBjdWxsIHdlYWsvb2xkIG9uZXNcbiAgICAgICAgICAgIGlmIChHYW1lLmZsYWdzWydJZGxlJ10gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKEdhbWUuZmxhZ3NbJ0lkbGUnXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJ1aWxkaW5nIGJhc2VkIGpvYnM/IVxuICAgIC8vIG5lZWQgdG8gc3Bhd24gYSBjcmVlcFxuICAgIHNwYXduQ3JlZXBzKG5lZWRlZENyZWVwcylcbn1cblxudmFyIGdldEJvZHlDb3N0ID0gKGJvZHk6IEJvZHlQYXJ0W10pOiBudW1iZXIgPT4ge1xuICAgIHZhciBjb3N0ID0gMFxuICAgIGZvciAodmFyIHBhcnQgb2YgYm9keSkge1xuICAgICAgICBjb3N0ICs9IEJPRFlQQVJUX0NPU1RbcGFydF1cbiAgICB9XG4gICAgcmV0dXJuIGNvc3Rcbn1cblxudmFyIGdldEJvZHlEZWZpbml0aW9uID0gKGJvZHk6IEJvZHlQYXJ0W10sIGVuZXJneUNhcGFjaXR5OiBudW1iZXIpOiBCb2R5UGFydFtdID0+IHtcbiAgICB2YXIgYm9keVBhcnRzID0gW11cbiAgICB2YXIgY29zdCA9IGdldEJvZHlDb3N0KGJvZHkpXG4gICAgY29uc29sZS5sb2coXCJCb2R5IGNvc3RzIFwiICsgY29zdClcbiAgICB2YXIgYm9keUNvdW50cyA9IE1hdGgubWluKE1hdGguZmxvb3IoZW5lcmd5Q2FwYWNpdHkgLyBjb3N0KSwgTWF0aC5mbG9vcig1MCAvIGJvZHkubGVuZ3RoKSlcbiAgICBjb25zb2xlLmxvZyhcIkdvaW5nIHRvIGJ1aWxkIHhcIiArIGJvZHlDb3VudHMpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2R5Q291bnRzOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoYm9keVBhcnRzLCBib2R5KVxuICAgIH1cbiAgICByZXR1cm4gYm9keVBhcnRzXG59XG5cblxuLy8gVE9ETzogU29tZSBzb3J0IG9mIGxpbWl0cyBvbiBjcmVlcHMsIG1heWJlIHJlZHVjZSBjaGFuY2Ugb2Ygc3Bhd25pbmcgZHVwbGljYXRlIGJvZGllcz9cbnZhciBzcGF3bkNyZWVwcyA9IChib2R5UGFydHM6IEJvZHlQYXJ0W11bXSkgPT4ge1xuICAgIGlmIChib2R5UGFydHMubGVuZ3RoID09IDApIHJldHVybjtcbiAgICAvLyBmb3IgZWFjaCBzcGF3biwgcGljayBhIHJhbmRvbSBib2R5LCB0aGVuIGJ1aWxkIHRoZSBsYXJnZXN0IG9mIHRoYXQgdHlwZSBmb3IgdGhlIGdpdmVuIHNwYXduXG4gICAgZm9yICh2YXIgc3Bhd25OYW1lIG9mIE9iamVjdC5rZXlzKEdhbWUuc3Bhd25zKSkge1xuICAgICAgICB2YXIgc3Bhd24gPSBHYW1lLnNwYXduc1tzcGF3bk5hbWVdO1xuICAgICAgICBpZiAoc3Bhd24uc3Bhd25pbmcgIT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHZhciBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBib2R5UGFydHMubGVuZ3RoKVxuICAgICAgICB2YXIgYm9keSA9IGJvZHlQYXJ0c1tpZHhdXG4gICAgICAgIHZhciBib2QgPSBnZXRCb2R5RGVmaW5pdGlvbihib2R5LCBzcGF3bi5yb29tLmVuZXJneUF2YWlsYWJsZSlcbiAgICAgICAgY29uc29sZS5sb2coXCJXYW50IHRvIHNwYXduIFwiLCBib2QpXG4gICAgICAgIHZhciBlcnIgPSBzcGF3bi5jcmVhdGVDcmVlcChib2QpXG4gICAgICAgIGlmIChlcnIgPT0gMCkge1xuICAgICAgICAgICAgYm9keVBhcnRzLnNwbGljZShpZHgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbnZhciBoYXNFbmVyZ3kgPSAocykgPT4ge1xuICAgIGlmIChzLmFtb3VudCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuYW1vdW50ID4gMDtcbiAgICB9XG5cbiAgICBpZiAocy5zdG9yZSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIHMuc3RvcmUuZW5lcmd5ID4gMDtcbiAgICB9XG4gICAgaWYgKHMuY2FycnkgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBzLmNhcnJ5LmVuZXJneSA+IDBcbiAgICB9XG4gICAgaWYgKHMuZW5lcmd5ICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcy5lbmVyZ3kgPiAwXG4gICAgfVxuICAgIHJldHVybiBmYWxzZVxufVxuXG52YXIgdHJhbnNmZXJFbmVyZ3kgPSAoZnJvbSx0byk6bnVtYmVyID0+IHtcbiAgICBpZiAoZnJvbS50cmFuc2ZlckVuZXJneSAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGZyb20udHJhbnNmZXJFbmVyZ3kodG8pXG4gICAgfVxuICAgIGlmIChmcm9tLnRyYW5zZmVyICE9IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gZnJvbS50cmFuc2Zlcih0bywgUkVTT1VSQ0VfRU5FUkdZKVxuICAgIH1cbn1cblxuXG52YXIgUm9sZXM6IHsgW2luZGV4OiBzdHJpbmddOiBKb2JGdW5jIH0gPSB7XG4gICAgbWVnYU1pbmVyOiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICB2YXIgc291cmNlSWQgPSBjcmVlcC5tZW1vcnkuc0lkO1xuXG4gICAgICAgIHZhciBzb3VyY2U7XG4gICAgICAgIGlmIChzb3VyY2VJZCAhPSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNvdXJjZSA9IEdhbWUuZ2V0T2JqZWN0QnlJZChzb3VyY2VJZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHNvdXJjZSA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICghY3JlZXAucG9zLmlzTmVhclRvKGpvYi5zdGFydCkpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY3JlZXAubG9nKGpvYi5zdGFydClcbiAgICAgICAgICAgIHNvdXJjZSA9IGpvYi5zdGFydC5wb3MuZmluZENsb3Nlc3RCeVJhbmdlKEZJTkRfU09VUkNFUylcbiAgICAgICAgICAgIGlmIChzb3VyY2UgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubWVtb3J5LnNJZCA9IHNvdXJjZS5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc291cmNlICE9IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdmFyIGVyciA9IGNyZWVwLmhhcnZlc3Qoc291cmNlKTtcbiAgICAgICAgICAgIGlmIChlcnIgPT0gRVJSX05PVF9JTl9SQU5HRSkge1xuICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLm1vdmVUbyhzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlcnI7XG4gICAgfSxcblxuICAgIHJlcGFpcjogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcbiAgICAgICAgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA9PSAwKSB7XG4gICAgICAgICAgICB2YXIgZW5lcmd5U291cmNlID0gZmluZE5lYXJlc3RTdG9yYWdlKGNyZWVwKVxuICAgICAgICAgICAgdmFyIGVyciA9IEVSUl9OT1RfSU5fUkFOR0VcbiAgICAgICAgICAgIGlmIChjcmVlcC5wb3MuaXNOZWFyVG8oZW5lcmd5U291cmNlKSkge1xuICAgICAgICAgICAgICAgIGVyciA9IHRyYW5zZmVyRW5lcmd5KGVuZXJneVNvdXJjZSwgY3JlZXApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBjcmVlcC5tb3ZlVG8oZW5lcmd5U291cmNlLCB7IHJldXNlUGF0aDogNDAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghY3JlZXAucG9zLmlzTmVhclRvKGpvYi5zdGFydCkpIHtcbiAgICAgICAgICAgIGNyZWVwLm1vdmVUbyhqb2Iuc3RhcnQsIHsgcmV1c2VQYXRoOiA0MCwgbWF4T3BzOiAxMDAwIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnIgPSBjcmVlcC5yZXBhaXIoPFN0cnVjdHVyZT5qb2Iuc3RhcnQpXG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBKT0JfQ09NUExFVEU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVyclxuICAgIH0sXG5cbiAgICBkZWxpdmVyOiAoY3JlZXA6IFNjcmVlcCwgam9iOiBKb2IpOiBudW1iZXIgPT4ge1xuICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0LCB7IHJldXNlUGF0aDogMjAsIG1heE9wczogMTAwMCB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGVyclxuICAgICAgICAgICAgdmFyIHN0YXJ0OiBTdHJ1Y3R1cmUgPSA8U3RydWN0dXJlPmpvYi5zdGFydFxuICAgICAgICAgICAgaWYgKChzdGFydCkuc3RydWN0dXJlVHlwZSA9PSAnY29udHJvbGxlcicgJiYgc3RhcnQub3duZXIgJiYgc3RhcnQub3duZXIudXNlcm5hbWUgPT0gJ29tZ2JlYXInKSB7XG4gICAgICAgICAgICAgICAgZXJyID0gY3JlZXAudXBncmFkZUNvbnRyb2xsZXIoPFN0cnVjdHVyZT5qb2Iuc3RhcnQpXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXJ0LmNvbnN0cnVjdG9yID09IENvbnN0cnVjdGlvblNpdGUpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5idWlsZCg8Q29uc3RydWN0aW9uU2l0ZT5qb2Iuc3RhcnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC50cmFuc2ZlckVuZXJneSg8U3RydWN0dXJlPmpvYi5zdGFydCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICBlcnIgPSBjcmVlcC5tb3ZlVG8oam9iLnN0YXJ0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoY3JlZXAuY2FycnkuZW5lcmd5ID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBKT0JfQ09NUExFVEU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVyclxuICAgIH0sXG5cbiAgICBjYXJyeTogKGNyZWVwOiBTY3JlZXAsIGpvYjogSm9iKTogbnVtYmVyID0+IHtcblxuICAgICAgICBpZiAoam9iLnN0YXJ0ICE9IHVuZGVmaW5lZCAmJiBjcmVlcC5jYXJyeS5lbmVyZ3kgPCBjcmVlcC5jYXJyeUNhcGFjaXR5ICYmIGhhc0VuZXJneShqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICBpZiAoIWNyZWVwLnBvcy5pc05lYXJUbyhqb2Iuc3RhcnQpKSB7XG4gICAgICAgICAgICAgICAgY3JlZXAubW92ZVRvKGpvYi5zdGFydCwgeyByZXVzZVBhdGg6IDIwLCBtYXhPcHM6IDEwMDAgfSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycjtcbiAgICAgICAgICAgICAgICBpZiAoKDxFbmVyZ3k+am9iLnN0YXJ0KS5hbW91bnQgIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9IGNyZWVwLnBpY2t1cCg8RW5lcmd5PmpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gKDxFbmVyZ3lIb2xkZXI+am9iLnN0YXJ0KS50cmFuc2ZlckVuZXJneShjcmVlcClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyID09IEVSUl9OT1RfSU5fUkFOR0UpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gY3JlZXAubW92ZVRvKGpvYi5zdGFydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNyZWVwLmNhcnJ5LmVuZXJneSA+IDApIHtcbiAgICAgICAgICAgIGpvYi5qb2JGdW5jID0gUm9sZXNbJ2RlbGl2ZXInXVxuICAgICAgICAgICAgam9iLnN0YXJ0ID0gam9iLmVuZFxuICAgICAgICAgICAgaWYgKGpvYi5lbmQgPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgam9iLmVuZCA9IGZpbmROZWFyZXN0U3RvcmFnZShjcmVlcClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBqb2IuZW5kXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVycjtcbiAgICB9XG59XG52YXIgUm9sZXNSZXZlcnNlID0ge31cbmZvciAodmFyIHJuIG9mIE9iamVjdC5rZXlzKFJvbGVzKSkge1xuICAgIHZhciBmbjogYW55ID0gUm9sZXNbcm5dXG4gICAgUm9sZXNSZXZlcnNlW2ZuXSA9IHJuXG59XG5cbnZhciBDbXA6IHsgW2luZGV4OiBzdHJpbmddOiBDcmVlcENtcCB9ID0ge1xuICAgIHdvcmtzSGFyZDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIGIuaG93TWFueVBhcnRzKFdPUkspIC0gYS5ob3dNYW55UGFydHMoV09SSylcbiAgICB9LFxuXG4gICAgY2Fycmllc1RoZU1vc3Q6IChhOiBTY3JlZXAsIGI6IFNjcmVlcCk6IG51bWJlciA9PiB7XG4gICAgICAgIHJldHVybiAoYS5jYXJyeUNhcGFjaXR5IC0gYS5jYXJyeS5lbmVyZ3kpIC0gKGIuY2FycnlDYXBhY2l0eSAtIGIuY2FycnkuZW5lcmd5KVxuICAgIH0sXG4gICAgbm9vcDogKGE6IFNjcmVlcCwgYjogU2NyZWVwKTogbnVtYmVyID0+IHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG5cbiAgICAvLyBjbG9zZVRvU3RhcnQ6IChhOkNyZWVwLCBiOkNyZWVwKSA6IG51bWJlciA9PiB7XG4gICAgLy8gICAgIHJldHVybiBhLnBvcy5nZXRSYW5nZVRvKGNyZWVwLmpvYi5zdGFydCkgLSBiLnBvcy5nZXRSYW5nZVRvKGNyZWVwLmpvYi5zdGFydCk7XG4gICAgLy8gfVxufVxudmFyIENtcFJldmVyc2UgPSB7fVxuZm9yICh2YXIgcm4gb2YgT2JqZWN0LmtleXMoQ21wKSkge1xuICAgIHZhciBmbjogYW55ID0gQ21wW3JuXTtcbiAgICBDbXBSZXZlcnNlW2ZuXSA9IHJuO1xufTtcblxuXG4vLyB2YXIgc3RhdGljSm9iczogSm9iW10gPSBbbmV3IEpvYih7XG4vLyAgICAgbmFtZTogXCJtZWdhX21pbmVyXzFcIixcbi8vICAgICBzdGFydDogR2FtZS5mbGFnc1snTWluZV8xXzEnXSxcbi8vICAgICBqb2JGdW5jOiBSb2xlc1snbWVnYU1pbmVyJ10sXG4vLyAgICAgYm9keVJlcTogW1dPUkssIE1PVkVdLFxuLy8gICAgIGNhbmRpZGF0ZUNtcDogQ21wWyd3b3Jrc0hhcmQnXSxcbi8vIH0pLCBuZXcgSm9iKHtcbi8vICAgICBuYW1lOiBcIm1lZ2FfbWluZXJfMlwiLFxuLy8gICAgIHN0YXJ0OiBHYW1lLmZsYWdzWydNaW5lXzFfMiddLFxuLy8gICAgIGpvYkZ1bmM6IFJvbGVzWydtZWdhTWluZXInXSxcbi8vICAgICBib2R5UmVxOiBbV09SSywgTU9WRV0sXG4vLyAgICAgY2FuZGlkYXRlQ21wOiBDbXBbJ3dvcmtzSGFyZCddLFxuLy8gfSldXG5cblxuXG52YXIgbWVtSm9iczogSm9iW10gPSBbXTtcbnRyeSB7XG4gICAgdmFyIGpvYnNKU09OID0gTWVtb3J5W1wiam9ic1wiXTtcbiAgICBpZiAoam9ic0pTT04gIT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG1lbUpvYnMgPSBKU09OLnBhcnNlKGpvYnNKU09OLCBwYXJzZUpvYilcbiAgICB9XG59IGNhdGNoIChleCkge1xuICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgcGFyc2luZyBpbiBtZW1vcnkgam9icyE6IFwiICsgZXggKyBcIlxcbiAgXCIgKyBNZW1vcnlbXCJqb2JzXCJdKVxuICAgIGNvbnNvbGUubG9nKGV4LnN0YWNrKVxufVxuXG5cblxuXG52YXIgcHJlSm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcbnJ1bkFsbEpvYnMobWVtSm9icylcbnZhciBwb3N0Sm9iVHMgPSBHYW1lLmNwdS5nZXRVc2VkKClcbnZhciB0b1JtIDogSm9iW10gPSBbXVxuZm9yICh2YXIgam9iIG9mIG1lbUpvYnMpIHtcbiAgICBpZiAoam9iLnN0YXJ0ID09IHVuZGVmaW5lZCkge1xuICAgICAgICB0b1JtLnB1c2goam9iKVxuICAgIH1cbn1cbmZvciAodmFyIGpvYiBvZiB0b1JtKSB7XG4gICAgdmFyIGlkeCA9IG1lbUpvYnMuaW5kZXhPZihqb2IpO1xuICAgIG1lbUpvYnMuc3BsaWNlKGlkeCwgMSk7XG59XG5cblxuTWVtb3J5W1wiam9ic1wiXSA9IEpTT04uc3RyaW5naWZ5KG1lbUpvYnMpXG5cbi8vY29uc29sZS5sb2cocG9zdEpvYlRzIC0gcHJlSm9iVHMpXG5cbi8vIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGpvYnMpKVxuLy8gY29uc29sZS5sb2coXG5cbi8vdmFyIGpvYnM6Sm9iW10gPSBbXVxuXG5cblxuR2FtZS5Sb2xlcyA9IFJvbGVzXG52YXIgY2xrID0gR2FtZS5mbGFnc1snQ2xvY2snXVxuaWYoY2xrICE9IHVuZGVmaW5lZCkge1xuICAgIGlmKGNsay5jb2xvciAhPSBDT0xPUl9XSElURSkge1xuICAgICAgICBjbGsuc2V0Q29sb3IoQ09MT1JfV0hJVEUpXG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xrLnNldENvbG9yKENPTE9SX0dSRVkpXG4gICAgfVxufSJdfQ==