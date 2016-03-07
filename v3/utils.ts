
var e = (o): boolean => {
  return o != null && o != undefined
}

var roomControlledByMe = (room: Room): boolean => {
    if (room == undefined || room.controller == undefined) {
        return false
    }
    if (room.controller.owner != undefined && room.controller.owner.username == 'omgbear') {
        return true
    }
    if (room.controller.reservation != undefined && room.controller.reservation.username == 'omgbear') {
        return true
    }
    return false
}

var ownedByMe = (struct: Structure): boolean => {
    if (struct.owner && struct.owner.username == 'omgbear'){
        return true
    }
    return roomControlledByMe(struct.room)
}

var getMyStructuresInAllRooms = (structTypes: string[]): Structure[] => {
    var structs = []
    for (var roomName of Object.keys(Game.rooms)) {
        structs.push.apply(getMyStructuresInRoom(roomName, structTypes))
    }
    return structs;
}

var needsEnergy = (s: Structure | ConstructionSite): boolean => {
  if (s.constructor == ConstructionSite) {
    return true
  }
    switch (s.structureType) {
        case STRUCTURE_STORAGE: 
        return (<Storage>s).store.energy < (<Storage>s).storeCapacity;
        case STRUCTURE_TOWER: 
        return (<Tower>s).energy < (<Tower>s).energyCapacity * .95
        case STRUCTURE_SPAWN:
        case STRUCTURE_EXTENSION:
        case STRUCTURE_LINK:
        case STRUCTURE_POWER_SPAWN:
        return (<EnergyHolder>s).energy < (<EnergyHolder>s).energyCapacity
        case STRUCTURE_CONTROLLER:
        return true
    }
    console.log("unknown struct needs energy" + s)
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


var needsRepair = (s: Structure): boolean => {
    if (s.structureType == STRUCTURE_WALL) {
        return s.hits < Math.min(s.hitsMax, 10000)
    }
    if (s.structureType == STRUCTURE_RAMPART) {
        return s.hits < Math.min(s.hitsMax, 10000)
    }
    return s.hits < s.hitsMax
}

var hasEnergy = (s) => {
    if (s.amount != undefined) {
        return s.amount > 50;
    }
    if (s.store != undefined) {
        return s.store.energy > 500;
    }
    if (s.carry != undefined) {
        return s.carry.energy > 0
    }
    if (s.energy != undefined) {
        return s.energy > 0
    }
    return false
}

var targetInSameOrNewRoom = (roomName: string): JobFilter => {
    return (job: Job): boolean => {
        return (e(job.target) && (!e(job.target.room) || !e(job.target.room.storage) || job.jobFunc == Roles['megaMiner'] || job.target.pos.roomName == roomName))
    }
}