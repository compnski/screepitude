var Mine;

Mine = (function() {
  function Mine(source) {
    this.source = source;
  }

  Mine.prototype.capacity = function() {
    var i, len, res, thing, things, wallCount, x, y, ys;
    x = this.source.pos.x;
    y = this.source.pos.y;
    res = this.source.room.lookForAtArea('terrain', y - 1, x - 1, y + 1, x + 1);
    wallCount = 0;
    for (x in res) {
      ys = res[x];
      for (y in ys) {
        things = ys[y];
        for (i = 0, len = things.length; i < len; i++) {
          thing = things[i];
          if (thing === 'wall') {
            wallCount += 1;
            break;
          }
        }
      }
    }
    return 9 - wallCount;
  };

  Mine.allInRoom = function(room) {
    var sources;
    sources = room.find(FIND_SOURCES);
    return sources.map(function(s) {
      return new Mine(s);
    });
  };

  return Mine;

})();

module.exports = Mine;

//# sourceMappingURL=mine.js.map
