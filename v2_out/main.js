var Role, e, r, realStart,
  slice = [].slice;

realStart = Game.cpu.getUsed();

Array.prototype.sum = function() {
  if (!this.length) {
    return 0;
  }
  return this.reduce(function(a, b) {
    return a + b;
  });
};

String.prototype.paddingLeft = function(paddingValue) {
  return String(paddingValue + this).slice(-paddingValue.length);
};

Creep.prototype.roleName = function() {
  var p;
  p = this.name.split("_");
  p.pop();
  return p.join("_");
};

Creep.prototype.index = function() {
  var parts;
  parts = this.name.split("_");
  return parts[parts.length - 2];
};

Creep.prototype.log = function() {
  var msg;
  msg = 1 <= arguments.length ? slice.call(arguments, 0) : [];
  return console.log.apply(console, ["[" + this.name + "]"].concat(slice.call(msg)));
};

Role = require('roles');

r = new Role();

try {
  r.run(realStart);
} catch (_error) {
  e = _error;
  console.log(e.message);
  console.log(e.stacktrace);
}

//# sourceMappingURL=main.js.map
