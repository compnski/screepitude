realStart = Game.cpu.getUsed()


Array.prototype.sum = ->
  return 0 unless @length
  @.reduce((a,b) -> a+b)

String.prototype.paddingLeft = (paddingValue) ->
   return String(paddingValue + this).slice(-paddingValue.length)

Creep.prototype.roleName = ->
  p = @name.split("_")
  p.pop()
  p.join("_")

Creep.prototype.index = ->
  parts = @name.split("_")
  parts[parts.length-2]

Creep.prototype.log = (msg...) ->
    console.log("[#{@name}]", msg...)


Role = require('roles')
r = new Role()
try
  r.run(realStart)
catch e
  console.log e.message
  console.log e.stacktrace


# newMem = {}
# for name,creep of Game.creeps
#   newMem[name] = creep.memory

# Memory.creeps = newMem
