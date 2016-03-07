const TARGET_SCORE_HEAL = 5
const TARGET_SCORE_ATTACK = 0
const TARGET_SCORE_SHOOT = 3

var scoreTarget = (src: Screep | Tower, target: Screep) => {
    var score = src.pos.getRangeTo(target)
    score += target.howManyParts(HEAL) * TARGET_SCORE_HEAL
    score += target.howManyParts(ATTACK) * TARGET_SCORE_ATTACK
    score += target.howManyParts(RANGED_ATTACK) * TARGET_SCORE_SHOOT
    return score
}

var targetAttactivenessCmp = (tower:Tower|Screep)  => {
    return (a:Screep,b:Screep):number => {
        return scoreTarget(tower, a) - scoreTarget(tower,b)
    }
}

var runTower = (tower) => {
    // Find structures, sort by priority?
    // Eventually tower can consume jobs:? or always separate
    // TODO: buildings/roads/ramparts/walls
    var enemies = tower.room.find(FIND_HOSTILE_CREEPS)
    if (enemies.length > 0) {
        enemies.sort(targetAttactivenessCmp(tower))
        tower.attack(enemies[0])
        return
    }

    var structures = tower.room.find(FIND_STRUCTURES)
    structures.sort((a, b) => { return a.hits - b.hits })
    for (var s of structures) {
        if (needsRepair(s)) {
            tower.repair(s)
            break
        }
    }
}
