module.exports = {
    findCreeps: function(options) {
        var creeps = [];
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            var matches = true;
            for (var key in options) {
                if (creep.memory[key] != options[key]) {
                    matches = false
                }
            }
            if (matches) {
                creeps.push(creep)
            }
        }
        return creeps;
    },

    findCreepByMemory: function(field, value) {
        var creeps = [];
        for (var name in Game.creeps) {
            var creep = Game.creeps[name];
            if (creep.memory[field] == value) {
                creeps.push(creep)
            }
        }
        return creeps;
    }
}