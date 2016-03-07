/// <reference path="screeps.d.ts" />
/// <reference path="globals.ts" />
/// <reference path="jobs.ts" />
/// <reference path="utils.ts" />


var transferEnergy = (from,to): number => {
    if (to.constructor == ConstructionSite) {
        return from.build(<ConstructionSite>to)
    }
    if (to.structureType == 'controller' && to.owner && to.owner.username == 'omgbear') {
        return from.upgradeController(<Structure>to)
    }
    if (from.transferEnergy != undefined) {
        return from.transferEnergy(to)
    } 
    if (from.transfer != undefined) {
        return from.transfer(to, RESOURCE_ENERGY)
    }
}

var findNearestEnergyProviders = (target: PositionEntity): EnergyHolder[] => {
    var sources: EnergyHolder[] = new Array().concat(
        target.room.find(FIND_DROPPED_RESOURCES),
        target.room.find(FIND_MY_STRUCTURES).filter((s: Structure)=>{
            if(s.id == target.id) {
                // Never select yourself
                return false
            }
            switch(s.structureType) {
                case STRUCTURE_STORAGE: {
                    return (<Storage>s).store.energy > 1000
                }
                case STRUCTURE_TOWER: 
                return s.room.storage == undefined && (<Tower>s).energy > (<Tower>s).energyCapacity * 0.9
                case STRUCTURE_SPAWN: 
                return s.room.storage == undefined && false //(<Spawn>s).room.energyAvailable < (<Spawn>s).energy * 2
                case STRUCTURE_LINK: 
                return (<Link>s).energy > 0
            }
        }))
    return sources
}

var findBestSource = (creep: Creep, target: PositionEntity): PositionEntity => {
    var allSources = findNearestEnergyProviders(target)
    var distanceCache = {}
    allSources = allSources.filter(s=>{return s != null})
    allSources.sort((a: PositionEntity, b: PositionEntity) => {
        if (distanceCache[a.id] == undefined)
            distanceCache[a.id] = creep.pos.getRangeTo(a) + target.pos.getRangeTo(a)
        if (distanceCache[b.id] == undefined)
            distanceCache[b.id] = creep.pos.getRangeTo(b) + target.pos.getRangeTo(b)
        return distanceCache[a.id] - distanceCache[b.id]
    })
    if (allSources.length > 0)
        return allSources[0]
    return null
}

var Roles: { [index: string]: JobFunc } = {
    megaMiner: (creep: Screep, job: Job): number => {
        var sourceId = creep.memory.sId;
        var source;
        if (sourceId != undefined) {
            source = Game.getObjectById(sourceId);
        }
        if (source == undefined) {
            if (!creep.pos.isNearTo(job.target)) {
                creep.moveTo(job.target, { reusePath: 20, maxOps: 1000 })
            }
            source = job.target.pos.findClosestByRange(FIND_SOURCES)
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
                creep.drop(RESOURCE_ENERGY)
            }
        }
        return err;
    },

    repair: (creep: Screep, job: Job): number => {
        if (!needsRepair(<Structure>job.target)) {
            return JOB_COMPLETE
        }
        if (creep.carry.energy < 50) {
            var energySource = findBestSource(creep, job.target)
            var err = ERR_NOT_IN_RANGE
            if (creep.pos.isNearTo(energySource)) {
                err = transferEnergy(energySource, creep)
            }
            if (err == ERR_NOT_IN_RANGE) {
                creep.moveTo(energySource, { reusePath: 40, maxOps: 1000 })
            }
        }
        if (!creep.pos.isNearTo(job.target)) {
            creep.moveTo(job.target, { reusePath: 40, maxOps: 1000 })
        } else {
            err = creep.repair(<Structure>job.target)
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(job.target);
            }
        }
        if (creep.carry.energy == 0 || !needsRepair(<Structure>job.target)) {
            return JOB_COMPLETE;
        }
        return err
    },

    fillFromBestSource: (creep: Screep, job: Job): number => {
        var source: PositionEntity
        var err: number
        if(creep.memory['src'] != undefined) {
            source = <Structure|Energy>Game.getObjectById(creep.memory['src'])
        }
        if(!e(source) || !hasEnergy(source)) {
            source = findBestSource(creep, job.target)
        }
        if (source == null) {
            return ERR_NOT_ENOUGH_RESOURCES
        }
        creep.memory['src'] = source.id
        if (!creep.pos.isNearTo(source)) {
            err = creep.moveTo(source, { reusePath: 20, maxOps: 1000 })
        } else {
            if ((<Energy>source).amount != undefined) {
                err = creep.pickup(<Energy>source);
            } else {
                err = (<EnergyHolder>source).transferEnergy(creep)
            }
            if (err == ERR_NOT_IN_RANGE) {
                err = creep.moveTo(source);
            }
        }
        if(creep.carry.energy == creep.carryCapacity || !hasEnergy(source)) {
            delete creep.memory['src']
            return JOB_COMPLETE
        }
        if (err == ERR_NO_PATH) {
          err = wiggle(creep)
        }
        return err
    },

    fillStruct: (creep: Screep, job: Job): number => {
        var err: number
        if(!needsEnergy(<Structure>job.target)) {
            creep.log("no energy needed for " + job.target)
            return JOB_COMPLETE
        }
        // fills job.target, 
        if (creep.carry.energy < 50) {
            // refill
            err = Roles["fillFromBestSource"](creep, job)
            if (err != JOB_COMPLETE) {
                return err
            }
        }

        err = transferEnergy(creep, job.target)
        if (err == ERR_NOT_IN_RANGE) {
          err = creep.moveTo(job.target, { reusePath: 20, maxOps: 1000 })
        }
        // if (err == ERR_INVALID_TARGET) {
        //   err = wiggle(creep)
        // }
        if(!needsEnergy(<Structure>job.target)) {
            creep.log("no energy needed for " + job.target)
            return JOB_COMPLETE
        }
        if (err == ERR_NO_PATH) {
          err = wiggle(creep)
        }
        return err
    }
}


var RolesReverse = {}
for (var rn of Object.keys(Roles)) {
    var fn: any = Roles[rn]
    RolesReverse[fn] = rn
}

var wiggle = (creep:Screep) => {
  return creep.move(Math.floor(1 + Math.random() * 7))
}