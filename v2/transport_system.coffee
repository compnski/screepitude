class TransportSystem

  run: ->
    console.log('Transport System')
    batchSize = 1000
    piles = {}  

    totalResources = 0
    for roomName, room of Game.rooms
      resources = room.find(FIND_DROPPED_RESOURCES)
      for resource in resources
        pos = resource.pos
        name = @posStr(pos)
        energy = resource.energy
        jobs = Math.floor(resource.energy / batchSize)
        if jobs == 0 and resource.energy > 600
          jobs = 1
        piles[name] = jobs if jobs > 0
        totalResources += resource.energy

    console.log("Total energy: #{totalResources}")
    console.log(JSON.stringify(piles))

    allocation = {}
    pilers = []
    for name, creep of Game.creeps
      if creep.memory.role == 'piler'
        pilers.push(creep)
        pile = creep.memory.pile
        if pile?
          allocation[pile] ||= 0
          allocation[pile] += 1
    console.log('allocation', JSON.stringify(allocation))  

    # Make Pilers
    # if pilers.length < 4
    #   parts = @makeRole({carry: 20, move: 20})
    #   name = "Piler #{Math.round(Math.random() * 10000)}"
    #   memory = {role: 'piler'}
    #   console.log("Making more pilers when possible")
    #   Game.spawns.Spawn1.createCreep(parts, name, memory)

    #Allocate Refills
    # for pile in ['E11N7-refill', 'E11N9-refill']    
    #   for piler in pilers
    #     continue if piler.memory.pile? or piler.memory.state == 'heal'
    #     continue if allocation[pile]? and allocation[pile] > 0
    #     allocation[pile] ||= 0
    #     allocation[pile] += 1
    #     piler.memory.pile = pile

    # Allocate non-refills
    for piler in pilers
      for pile, size of piles
        continue if piler.memory.pile? or piler.memory.state == 'heal'
        continue if allocation[pile]? and allocation[pile] >= size
        allocation[pile] ||= 0
        allocation[pile] += 1
        piler.memory.pile = pile

    for piler in pilers
      try
        @work(piler)
      catch e
        console.log(e.stack)

    console.log("Num pilers: #{pilers.length}")

  allocate: (allocation, piler, pile) ->
    allocation[pile] ||= 0
    allocation[pile] += 1
    piler.memory.pile = pile

  workerStorage: (worker) ->
    stores = worker.room.find(FIND_DROPPED_RESOURCES).filter((s) -> s.amount > 50)
    stores.push @storageInRoom(worker.room)    
    return worker.pos.findClosestByPath(stores)

  nearestRefillable: (worker) ->
    targets = worker.room.find(FIND_MY_STRUCTURES).filter((c) -> 
      good_structure = (c.structureType == 'extension' ||  c.structureType == 'spawn' || c.structureType == 'tower') 
      good_energy = c.energy < (c.energyCapacity - 20) && (c.structureType != 'tower' or c.energy < 500)
      return good_structure && good_energy)

    worker.pos.findClosestByPath(targets)

  takeEnergy: (worker, target) ->
    if (target.transferEnergy && target.transferEnergy(worker) || worker.harvest(target)) == ERR_NOT_IN_RANGE
      Game.wp.move(worker, -> target)

  giveEnergy: (worker, target) ->
    if target?.structureType == 'controller'
      workerFunc = (t) -> worker.upgradeController(t)
    else
      workerFunc = (t) -> worker.transferEnergy(t)
    if workerFunc(target) == ERR_NOT_IN_RANGE
      Game.wp.move(worker, -> target)

  refill: (piler) ->
    piler.memory.state = 'fill' if piler.carry.energy == 0 or !piler.memory.state?
    piler.memory.state = 'dump' if piler.carry.energy == piler.carryCapacity
    piler.say('refill+' + piler.memory.state)

    if piler.memory.state == 'fill'
      @takeEnergy(piler, @workerStorage(piler)) 
    else if piler.memory.state == 'dump'
      refillRoom = piler.memory.pile.split('-')[0]
      if piler.room.name != refillRoom
        Game.wp.move(piler, -> Game.rooms[refillRoom].controller)
      @giveEnergy(piler, @nearestRefillable(piler))

  work: (piler) ->
    return unless piler.ticksToLive
    console.log(piler.name, 
      "is working as piler on pile", piler.memory.pile || 'NULL        ', 
      "in state", piler.memory.state,
      "w/ life", piler.ticksToLive,
      "with energy", piler.carry.energy)
    if (piler.memory.pile || '').indexOf('-refill') != -1
     @refill(piler)
     return
    if piler.memory.state != 'heal' or piler.ticksToLive > 1000
      piler.memory.state = null if piler.memory.state == 'heal'
      piler.memory.state = 'fill' if piler.carry.energy == 0 or !piler.memory.state?
      if piler.carry.energy == piler.carryCapacity
        piler.memory.state = 'dump' 
        piler.memory.pile = null
      piler.memory.state = 'heal' if piler.ticksToLive < 200 and piler.carry.energy == 0

    if piler.memory.state == 'heal'
      piler.say('heal')
      piler.memory.pile = null
      if piler.room.name == 'E11N9' or Game.spawns.Spawn1.spawning?
        spawn = Game.spawns.Spawn2
      else
        spawn = Game.spawns.Spawn1
      renewRes = spawn.renewCreep(piler) if spawn?
      if renewRes == ERR_NOT_IN_RANGE
        Game.wp.move(piler, -> spawn)

    if piler.memory.state == 'fill' and piler.memory.pile
      piler.say('filling')
      pile = piler.memory.pile
      pileParts = pile.split(',')
      roomName = pileParts[0]
      x = parseInt(pileParts[1])
      y = parseInt(pileParts[2])
      roomPos = new RoomPosition(x, y, pileParts[0])

      if !Game.rooms[roomName]?
        piler.memory.pile = null
        return
      objs = Game.rooms[roomName].lookAt(x, y)
      resource = objs.filter((o) -> o.type == 'resource')[0]
      if !resource?
        piler.memory.pile = null
        return
      resource = resource.resource
      pickupRes = piler.pickup(resource)
      if pickupRes == ERR_NOT_IN_RANGE
        piler.log resource
        Game.wp.move(piler, -> resource) if resource?
    else if piler.memory.state == 'dump'
      if piler.room.name == 'E11N9'
        storage = @storageInRoom(piler.room)
      else
        storage = @storageInRoom(Game.spawns.Spawn1.room)

      if piler.transferEnergy(storage) == ERR_NOT_IN_RANGE
        Game.wp.move(piler, -> storage)

      piler.say('dumping')


  posStr: (pos) ->
    "#{pos.roomName},#{pos.x},#{pos.y}"

  storageInRoom: (room) ->
    stores = room.find(FIND_MY_STRUCTURES).filter((s) -> s.structureType == STRUCTURE_STORAGE)
    stores = room.find(FIND_MY_STRUCTURES).filter((s) -> s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION) if stores.length == 0
    return null if stores.length == 0
    return stores[0]

  makeRole: (partsMap) ->
    parts = []
    for part, count of partsMap
      for i in [0...count]
        parts.push(part)
    return parts

module.exports = TransportSystem