Agent = require('agent')

for name, creep of Game.creeps
  agent = new Agent(creep)
  agent.dumbHarvesting()