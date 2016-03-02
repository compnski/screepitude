/*
---
definition file of the js Facebook SDK
author: [Semigradsky Dmitry](https://github.com/Semigradsky)
license: [MIT License](https://github.com/Semigradsky/screeps-typescript-definition/blob/master/LICENSE)
*/

interface PositionEntity { 
    pos: RoomPosition
    id: string
    transferEnergy(creep:Creep): number;
}
interface RepairableEntity { }
interface AttackableEntity extends PositionEntity { }

declare var Memory: any;

//////////////////////////////////////////////////////////// MAIN OBJECTS //////////////////////////////////////////////////////////////////

/** A site of a structure which is currently under construction.
 * A construction site can be created using the 'Construct' button at the left of the game field. */
interface ConstructionSite extends PositionEntity {

    /** A unique object identificator. */
    id: string;

    /** An object with the structure’s owner info. */
    owner: Owner;

    /** The link to the Room object of this structure. */
    room: Room;

    /** An object representing the position of this structure in the room. */
    pos: RoomPosition;

    /** The current construction progress. */
    progress: number;

    /** The total construction progress needed for the structure to be built. */
    progressTotal: number;

    /** One of the following: ‘spawn’, ‘extension’, ‘road’, ‘constructedWall’, ‘rampart’. */
    StructureTypes: string;

    /** Whether this is your own construction site. */
    my: boolean;
}


/** Creeps are your units. Creeps can move, harvest energy, construct structures, attack another creeps, and perform other actions. */
interface Creep extends AttackableEntity {

    /** A unique object identificator. */
    id: string;

    /** Creep’s name. You can choose the name while creating a new creep, and it cannot be changed later.
     * This name is a hash key to access the creep via the Game.creeps object. */
    name: string;

    /** An object with the creep’s owner info. */
    owner: Owner;

    /** The link to the Room object of this creep. */
    room: Room;

    /** An object representing the position of this creep in a room. */
    pos: RoomPosition;

    /** A shorthand to Memory.creeps[creep.name]. You can use it for quick access the creep’s specific memory data object. */
    memory: any;

    /** Whether it is your creep or foe. */
    my: boolean;

    /** Whether this creep is still being spawned. */
    spawning: boolean;

    /** An array describing the creep’s body. */
    body: {

        /** One of the body parts constants. */
        type: string;

        /** The remaining amount of hit points of this body part. */
        hits: number

    }[];

    /** The current amount of energy the creep is carrying. */
    energy: number;

    /** The total amount of energy the creep can carry. */
    energyCapacity: number;

    /** The current amount of hit points of the creep. */
    hits: number;

    /** The maximum amount of hit points of the creep. */
    hitsMax: number;

    /** The remaining amount of game ticks after which the creep will die. */
    ticksToLive: number;

    /** The movement fatigue indicator. If it is greater than zero, the creep cannot move. */
    fatigue: number;

    /** Attack another creep or structure in a short-ranged attack. If the target is inside a rampart, then the rampart is attacked instead.
     * Needs the ATTACK body part.
     * @param target The target object to be attacked.
     */
    attack(target: AttackableEntity): GameCode;

    /** Build a structure at the target construction site using carried energy.
     * Needs WORK and CARRY body parts.
     * @param target The target construction site to be built.
     */
    build(target: ConstructionSite): GameCode;

    /** Drop a piece of energy on the ground.
     * @param amount The amount of energy to be dropped. If omitted, all the available carried energy is used.
     */
    dropEnergy(amount?: number): GameCode;

    /** Get the quantity of live body parts of the given type. Fully damaged parts do not count.
     * @param type A body part type, one of body part constants.
     * @returns A number representing the quantity of body parts.
     */
    getActiveBodyparts(type: string): number;

    /** Harvest energy from the source. Needs the WORK body part.
     * If the creep has an empty CARRY body part, the harvested energy is put into it; otherwise it is dropped on the ground.
     * @param target The source object to be harvested.
     */
    harvest(target: Source): GameCode;

    /** Heal another creep. It will restore the target creep’s damaged body parts function and increase the hits counter.
     * Needs the HEAL body part.
     * @param target The target creep object.
     */
    heal(target: Creep): GameCode;

    /** Move the creep one square in the specified direction.
     * Needs the MOVE body part. */
    move(direction: Direction): GameCode;

    /** Find an optimal path to the target within the same room and move to it. A shorthand to consequent calls of pos.findPathTo() and move() methods.
     * Needs the MOVE body part.
     * @param x X position of the target in the room.
     * @param y Y position of the target in the room.
     */
    moveTo(x: number, y: number): GameCode;

    /** Find an optimal path to the target within the same room and move to it. A shorthand to consequent calls of pos.findPathTo() and move() methods.
     * Needs the MOVE body part. */
    moveTo(target: PositionEntity, opts?: PathfindingOptions): GameCode;

    /** Pick up an item (a dropped piece of energy). Needs the CARRY body part.
     * @param target The target object to be picked up.
     */
    pickup(target: Energy): GameCode;

    /** A ranged attack against another creep or structure. If the target is inside a rampart, the rampart is attacked instead.
     * Needs the RANGED_ATTACK body part.
     * @param target The target object to be attacked.
     */
    rangedAttack(target: AttackableEntity); GameCode;

    /** Repair a damaged structure (spawn, extension, rampart, or road) using carried energy.
     * Needs the WORK and CARRY body parts.
     * @param target The target structure to be repaired.
     */
    repair(target: RepairableEntity): GameCode;

    /** Transfer energy from the creep to another object which can contain energy.
     * @param target The target object.
     * @param amount The amount of energy to be transferred. If omitted, all the available carried energy is used.
     */
    transferEnergy(target: AttackableEntity, amount?: number): GameCode;
}


/** A dropped piece of energy. It will decay after a while if not picked up. */
interface Energy extends PositionEntity {

    /** A unique object identificator. */
    id: string;

    /** The link to the Room object of this structure. */
    room: Room;

    /** An object representing the position in the room. */
    pos: RoomPosition;

    /** The amount of energy containing. */
    energy: number;
}


/** An exit to another room. */
interface Exit {

    /** A unique object identificator. */
    id: string;

    /** The link to the Room object. May not be available in case a flag is placed in a room which you do not have access to. */
    room: Room;

    /** An object representing the position of this structure in the room. */
    pos: RoomPosition;

    /** The direction of the exit. */
    exit: ExitDirection;
}


/** A flag. Flags can be used to mark particular spots in a room. */
interface Flag {

    /** A unique object identificator. */
    id: string;

    /** Flag’s name. You can choose the name while creating a new flag, and it cannot be changed later.
     * This name is a hash key to access the spawn via the Game.flags object. */
    name: string;

    /** The name of the room in which this flag is in. */
    roomName: string;

    /** The link to the Room object. May not be available in case a flag is placed in a room which you do not have access to. */
    room: Room;

    /** An object representing the position of this structure in the room. */
    pos: RoomPosition;
}


/** The main global game object containing all the gameplay information. */
declare var Game: {

    /** A hash containing all your creeps with creep names as hash keys. */
    creeps: { [name: string]: Creep };

    /** A hash containing all your flags with flag names as hash keys. */
    flags: { [name: string]: Flag };

    /** A hash containing all your spawns with spawn names as hash keys. */
    spawns: { [name: string]: Spawn };

    /** A hash containing all your structures with structure id as hash keys. */
    structures: { [name: string]: Structure };

    /** System game tick counter. It is automatically incremented on every tick. */
    time: number;

    /** Send a custom message at your profile email. This way, you can set up notifications to yourself on any occasion within the game.
     * Not available in the Simulation Room.
     * @param message Custom text which will be sent in the message.
     */
    notify(message: string): void;

    /** Body part.
     * Moves a creep 1 square per tick per 1 other body part
     * Build cost: 50 */
    MOVE: string;

    /** Body part.
     * Harvests 2 energy units from a source per tick; constructs a structure for 1 energy per tick; repairs a structure for 10 hits per tick.
     * Build cost: 20 */
    WORK: string;

    /** Body part.
     * Can contain up to 50 energy units.
     * Build cost: 50 */
    CARRY: string;

    /** Body part.
     * Attacks another creep/structure with 30 hits per tick in a short-ranged attack.
     * Build cost: 100 */
    ATTACK: string;

    /** Body part.
     * Attacks another creep/structure with 15 hits per tick in a long-ranged attack up to 3 squares long.
     * Build cost: 150 */
    RANGED_ATTACK: string;

    /** Body part.
     * Heals another creep restoring 10 hits per tick.
     * Build cost: 200 */
    HEAL: string;

    /** Body part.
     * "Empty" part with the sole purpose of defense.
     * Build cost: 5 */
    TOUGH: string;
}


/** An object representing the room in which your creeps, spawns, and extensions are in. It can be used to look around, find paths, etc.
 * Every object in the room contains its linked Room instance as the room property. */
interface Room {

    /** The name of the room. */
    name: string;

    /** Find all objects of the specified type in the room.
     * @param opts An object with additional options.
     * @returns An array with the objects found.
     */
    find(type: RoomObjTypes, opts?: { filter: any }): any[];

    /** Get the list of objects at the specified room position.
     * @param x X position in the room.
     * @param y Y position in the room.
     */
    lookAt(x: number, y: number): RoomPositionObject[];

    /** Get the list of objects at the specified room position. */
    lookAt(target: PositionEntity): RoomPositionObject[];

    /** Find an optimal path between fromPos and toPos.
     * @param fromPos The start position.
     * @param toPos The end position.
     * @param opts An object containing additonal pathfinding flags
     */
    findPath(fromPos: RoomPosition, toPos: RoomPosition, opts?: PathfindingOptions): FindStep[];

    /** Create a room snapshot with all objects currently present in the room.
     * Room snapshots are saved in your account so that you can later check out if something happened in the game when you were offline.
     * Not available in the Simulation Room.
     * @param description The description message which will be attached to the snapshot.
     */
    makeSnapshot(description?: string): void;
}


/** An object representing the specified position in the room. Every object in the room contains RoomPosition as the pos property. */
interface RoomPosition extends PositionEntity {

    /** X position in the room.*/
    x: number;

    /** Y position in the room. */
    y: number;

    /** The name of the room. */
    roomName: string;

    /** Check whether this position is in the given range of another position.
     * @param toPos The target position.
     * @param range The range distance.
     */
    inRangeTo(toPos: RoomPosition, range: number): boolean;

    /** Check whether this position is on the adjacent square to the specified position. The same as inRangeTo(target, 1).
     * @param x X position in the room.
     * @param y Y position in the room.
     */
    isNearTo(x: number, y: number): boolean;

    /** Check whether this position is on the adjacent square to the specified position. The same as inRangeTo(target, 1).
     * @param target Can be a RoomPosition object or any object containing RoomPosition.
     */
    isNearTo(target: PositionEntity): boolean;

    /** Get linear direction to the specified position.
     * @param x X position in the room.
     * @param y Y position in the room.
     */
    getDirectionTo(x: number, y: number): Direction;

    /** Get linear direction to the specified position.
     * @param target Can be a RoomPosition object or any object containing RoomPosition.
     */
    getDirectionTo(target: PositionEntity): Direction;

    /** Find an optimal path to the specified position. A shorthand for Room.findPath.
     * @param x X position in the room.
     * @param y Y position in the room.
     * @param target Can be a RoomPosition object or any object containing RoomPosition.
     * @param opts An object containing additonal pathfinding flags
     */
    findPathTo(x: number, y: number, target: PositionEntity, opts?: PathfindingOptions): FindStep[];

    /** Find an object of the specified type with the shortest path.
     * @param opts An object with additional options.
     * @returns The closest object if found, null otherwise.
     */
    findNearest(type: RoomObjTypes, opts?: { filter: any }): any;

    /** Find all objects in the specified linear range of the given type.
     * @param range The range distance.
     * @param opts An object with additional options.
     * @returns An array with the objects found.
     */
    findInRange(type: RoomObjTypes, range: number, opts?: PathfindingOptions): any[];

    /** Check whether this position is the same as the specified position.
     * @param x X position in the room.
     * @param y Y position in the room.
     */
    equalsTo(x: number, y: number): boolean;

    /** Check whether this position is the same as the specified position.
     * @param target Can be a RoomPosition object or any object containing RoomPosition. */
    getDirectionTo(target: PositionEntity): boolean;
}


/** An energy source object. Can be harvested by creeps with a WORK body part. */
interface Source extends PositionEntity {

    /** A unique object identificator. */
    id: string;

    /** The link to the Room object of this structure. */
    room: Room;

    /** An object representing the position of this structure in the room. */
    pos: RoomPosition;

    /** The remaining amount of energy. */
    energy: number;

    /** The total amount of energy in the source. */
    energyCapacity: number;

    /** The remaining time after which the source will be refilled. */
    ticksToRegeneration: number;
}


/** Spawns are your colony centers. You can transfer energy into it and create new creeps using createCreep() method. */
interface Spawn extends Structure {

    /** A unique object identificator. */
    id: string;

    /** Spawn’s name. You choose the name upon creating a new spawn, and it cannot be changed later.
     * This name is a hash key to access the spawn via the Game.spawns object. */
    name: string;

    owner: Owner;

    /** The link to the Room object of this spawn. */
    room: Room;

    /** An object representing the position of this spawn in a room. */
    pos: RoomPosition;

    /** A shorthand to Memory.spawns[spawn.name]. You can use it for quick access the spawn’s specific memory data object. */
    memory: any;

    /** Whether it is your spawn or foe. */
    my: boolean;

    /** Always equal to ‘spawn’. */
    structureType: string;

    /** If the spawn is in process of spawning a new creep, this object will contain the new creep’s information, or null otherwise. */
    spawning: {

        /** The name of a new creep. */
        name: string;

        /** Time needed in total to complete the spawning. */
        needTime: number;

        /** Remaining time to go. */
        remainingTime: number;
    }

    /** The amount of energy containing in the spawn. */
    energy: number;

    /** The total amount of energy the spawn can contain */
    energyCapacity: number;

    /** The current amount of hit points of the spawn. */
    hits: number;

    /** The maximum amount of hit points of the spawn. */
    hitsMax: number;

    /** Start the creep spawning process.
     * @param body An array describing the new creep’s body. Should contain 1 to 30 elements with one of body constants.
     * @param name The name of a new creep. It should be unique creep name, i.e. the Game.creeps object should not contain another creep with the same name (hash key).
     * If not defined, a random name will be generated.
     * @param memory The memory of a new creep. If provided, it will be immediately stored into Memory.creeps[name].
     */
    createCreep(body: string[], name?: string, memory?: any): GameCode;

    /** Transfer the energy from the spawn to a creep.
     * @param target The creep object which energy should be transferred to.
     * @param amount The amount of energy to be transferred. If omitted, all the remaining amount of energy will be used.
     */
    transferEnergy(target: Creep, amount?: number): GameCode;
}


/** An object representing one of the following structures: extension, road, rampart, constructed wall. */
interface Structure extends AttackableEntity, RepairableEntity {

    /** A unique object identificator. */
    id: string;

    owner: Owner;

    /** The link to the Room object. May not be available in case a flag is placed in a room which you do not have access to. */
    room: Room;

    /** An object representing the position of this structure in the room. */
    pos: RoomPosition;

    /** The current amount of hit points of the structure. */
    hits: number;

    /** The total amount of hit points of the structure. */
    hitsMax: number;

    /** One of the following: ‘extension’, ‘road’, ‘constructedWall’, ‘rampart’. */
    structureType: string;

    /** Whether this is your own structure. */
    my: boolean;

    /** The amount of energy containing in the extension. (extensions only) */
    energy: number;

    /** The total amount of energy the extension can contain. (extensions only) */
    energyCapacity: number;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/** An object containing additonal pathfinding flags */
interface PathfindingOptions {

    /** The maximum limit of possible pathfinding operations. The greater the value, the more accurate path will be found, but more CPU time could be used.
     * The default value is 1000. */
    maxOps?: number;

    /** Treat squares with creeps as walkable. Can be useful with too many moving creeps around or in some other cases. The default value is false. */
    ignoreCreeps?: boolean;

    /** Treat squares with destructible structures (constructed walls, ramparts, spawns, extensions) as walkable.
     * Use this flag when you need to move through a territory blocked by hostile structures.
     * If a creep with an ATTACK body part steps on such a square, it automatically attacks the structure. The default value is false. */
    ignoreDestructibleStructures?: boolean;

    /** The path will be found only within the area of your ramparts. Use it to move your creeps safely. The default value is false. */
    withinRampartsOnly?: boolean;
}


interface RoomPositionObject extends Object {
    type: string // 'structure' | 'terrain' | 'source'
    'creep'?: Creep
    'spawn'?: Spawn
    'structure'?: any
    'terrain'?: string // 'wall' | 'swamp'
    'source'?: Source
    // ToDo: That's not all.
}


declare enum GameCode {
    OK = 0,
    NotOwner = -1,
    NoPath = -2,
    NameExists = -3,
    Busy = -4,
    NotFound = -5,
    NotEnoughEnergy = -6,
    InvalidTarget = -7,
    Full = -8,
    NotInRange = -9,
    InvalidArgs = -10,
    Tired = -11,
    NoBodyPart = -12,
    NotEnoughExtensions = -13
}


declare enum Direction {
    Top = 1,
    TopRight = 2,
    Right = 3,
    BottomRight = 4,
    Bottom = 5,
    BottomLeft = 6,
    Left = 7,
    TopLeft = 8
}


declare enum ExitDirection {
    Top = 1,
    Right = 3,
    Bottom = 5,
    Left = 7
}


declare enum RoomObjTypes {
    Creeps = 1,
    MyCreeps = 2,
    HostileCreeps = 3,
    SourcesActive = 4,
    Sources = 5,
    DroppedEnergy = 6,
    Structures = 7,
    MyStructures = 8,
    HostileStructures = 9,
    Flags = 10,
    ConstructionSites = 11,
    MySpawns = 12,
    HostileSpawns = 13,
    ExitTop = 14,
    ExitRight = 15,
    ExitBottom = 16,
    ExitLeft = 17,
}


interface Owner {
    username: string;
}


interface FindStep {
    x: number;
    y: number;
    dx: number;
    dy: number;
    direction: Direction;
}
