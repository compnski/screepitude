var DIRECTIONS, Waypointer, wiggle;

DIRECTIONS = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];

wiggle = function(creep) {
  creep.log('wiggle!');
  return creep.move(DIRECTIONS[parseInt(Math.random() * DIRECTIONS.length)]);
};

Waypointer = (function() {
  function Waypointer() {
    var flag, name;
    this.WP = (function() {
      var ref, results;
      ref = Game.flags;
      results = [];
      for (name in ref) {
        flag = ref[name];
        if (name.indexOf("WP_") > -1) {
          results.push(flag);
        }
      }
      return results;
    })();
  }

  Waypointer.prototype.wpForRoom = function(name) {
    return Game.roomNameToPos[name];
  };

  Waypointer.prototype.distance = function(a, b) {
    var base, base1, base2, cache_key, e, opts;
    if (a.getRangeTo(b) > 10) {
      return Infinity;
    }
    opts = {
      ignoreCreeps: true,
      ignoreDestructibleStructures: false
    };
    if (a.constructor !== Creep && b.constructor !== Creep) {
      a.memory || (a.memory = {});
      a.distances = a.memory.distances;
    }
    a.distances || (a.distances = {});
    cache_key = b.id || b;
    try {
      if (a.constructor !== Creep && b.constructor !== Creep) {
        (base = a.distances)[cache_key] || (base[cache_key] = a.findPathTo(b, opts).length);
      } else {
        (base1 = a.distances)[cache_key] || (base1[cache_key] = a.getRangeTo(b));
      }
    } catch (_error) {
      e = _error;
      console.log(e);
      console.log(e.stack);
      (base2 = a.distances)[cache_key] || (base2[cache_key] = a.getRangeTo(b));
    }
    if (a.distances[cache_key] < Infinity && a.constructor !== Creep && b.constructor !== Creep) {
      a.memory || (a.memory = {});
      a.memory.distances = a.distances;
    }
    return a.distances[cache_key];
  };

  Waypointer.prototype.nextWaypointEnRouteTo = function(frm, to, exclude) {
    var e, opts, r, targetDistance, waypoints, wp;
    if (exclude == null) {
      exclude = [];
    }
    if (frm == null) {
      return;
    }
    if (frm.pos != null) {
      frm = frm.pos;
    }
    if (frm.inRangeTo.constructor !== 'function') {
      console.log("&&&&&&&&&&&&&&&&&&&&&&&");
      console.log("WEIRD FROM " + frm);
      return null;
    }
    opts = {
      ignoreCreeps: false,
      ignoreDestructibleStructures: false
    };
    targetDistance = this.distance(frm, to);
    waypoints = (function() {
      var i, len, ref, results;
      ref = this.WP;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        wp = ref[i];
        if (wp.pos.roomName === frm.roomName && frm.inRangeTo(wp.pos, 10) && exclude.indexOf(wp) === -1 && this.distance(frm, wp) > 2 && this.distance(wp.pos, to) < targetDistance) {
          results.push(wp);
        }
      }
      return results;
    }).call(this);
    try {
      r = frm.findClosestByRange(waypoints, opts);
    } catch (_error) {
      e = _error;
      console.log(e);
      console.log('zZZZZZZZzzZZZZZZzzz');
      return null;
    }
    return r;
  };

  Waypointer.prototype.buildMoveInfo = function(creep, finalTarget) {
    var IGNORE_CREEP_RANGE, nextWp, path, target;
    IGNORE_CREEP_RANGE = 0;
    creep.log(finalTarget, finalTarget.pos);
    path = creep.pos.findPathTo(finalTarget, {
      maxOps: 1000
    });
    if (path.length && path.length < 100) {
      return [path, finalTarget.id, finalTarget.id];
    }
    creep.log("No easy path to " + finalTarget + ", got " + path);
    target = finalTarget;
    path = creep.pos.findPathTo(target, {
      maxOps: 1000
    });
    if (path.length && path.length < 40) {
      return [path, target.id, finalTarget.id];
    }
    if (!target) {
      return null;
    }
    nextWp = this.nextWaypointEnRouteTo(creep, target);
    if (!nextWp) {
      return null;
    }
    path = creep.pos.findPathTo(nextWp, {
      maxOps: 1000
    });
    if (path.length) {
      return [path, target.id, finalTarget.id];
    }
    creep.log("Failed to find path to " + nextWp + ", got " + path);
    return null;
  };

  Waypointer.prototype.move = function(creep, targetFn) {
    var base, err, exitDir, p, pl, ref, ret, target, wp;
    if (creep.fatigue > 0) {
      return 0;
    }
    if (typeof targetFn !== 'function') {
      creep.log("BAD ARG");
      throw new Error("Bad Arg");
    }
    if ((creep.pos.y % 49) === 0 && ((ref = creep.memory.moveInfo) != null ? ref.length : void 0)) {
      exitDir = Game.map.findExit(creep.pos.roomName, creep.memory.moveInfo[2]);
      creep.move(exitDir);
      creep.log("EXIT MOVING!! " + exitDir);
    }
    try {
      if (!creep.memory.moveInfo || creep.memory.moveInfo[0].length === 0 || creep.memory.last_r !== creep.pos.roomName) {
        creep.log('       NEW PATH');
        target = targetFn(creep);
        creep.memory.moveInfo = this.buildMoveInfo(creep, target);
      }
      if (!creep.memory.moveInfo) {
        target || (target = targetFn(creep));
        ret = creep.moveTo(target);
        if (ret < 0) {
          ret = creep.moveTo(this.nextWaypointEnRouteTo(creep, target));
          if (ret < 0) {
            if (creep.pos.roomName === target.pos.roomName) {
              wp = this.nearestWaypoint(creep);
              if (wp) {
                ret = creep.moveTo(wp);
              }
            } else {
              exitDir = Game.map.findExit(creep.pos.roomName, target);
              creep.log("BACKUP MOVE FAILED!! to: " + target + " Got " + ret + ", going " + exitDir);
              ret = creep.move(exitDir);
            }
            if (ret < 0) {
              if (creep.pos.roomName === target.pos.roomName) {
                wp = this.nearestWaypoint(creep);
                if (wp) {
                  ret = creep.moveTo(wp);
                }
              } else {
                exitDir = Game.map.findExit(creep.pos.roomName, target);
                creep.log("BACKUP MOVE FAILED!! Got " + ret + ", going " + exitDir);
                creep.move(exitDir);
              }
            }
          }
        }
        return ret;
      }
      if (creep.memory.moveInfo[0].length === 0) {
        return;
      }
      pl = creep.memory.moveInfo[0].length;
      err = creep.moveByPath(creep.memory.moveInfo[0]);
      while (err === -5 && creep.memory.moveInfo[0].length) {
        p = creep.memory.moveInfo[0];
        p.pop();
        creep.memory.moveInfo[0] = p;
        err = creep.moveByPath(creep.memory.moveInfo[0]);
      }
      if (err !== 0) {
        creep.log("Error moving!! Got " + err);
      } else {
        creep.log('moved ok to ', JSON.stringify(creep.memory.moveInfo[0][0]));
        p = creep.memory.moveInfo[0];
        p.pop();
        creep.memory.moveInfo[0] = p;
      }
      if (creep.memory.last_x === creep.pos.x && creep.memory.last_y === creep.pos.y) {
        (base = creep.memory).failcount || (base.failcount = 0);
        creep.memory.failcount++;
        if (creep.memory.failcount > 10) {
          delete creep.memory.moveInfo;
          creep.memory.failcount = 0;
        }
      }
    } finally {
      creep.memory.last_x = creep.pos.x;
      creep.memory.last_y = creep.pos.y;
      creep.memory.last_r = creep.pos.roomName;
    }
    return err;
  };

  Waypointer.prototype.nearestWaypoint = function(frm, exclude) {
    var e, opts, r, waypoints, wp;
    if (exclude == null) {
      exclude = [];
    }
    if (frm.pos != null) {
      frm = frm.pos;
    }
    opts = {
      ignoreCreeps: true,
      ignoreDestructibleStructures: false
    };
    waypoints = (function() {
      var i, len, ref, results;
      ref = this.WP;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        wp = ref[i];
        if (wp.pos.roomName === frm.roomName && exclude.indexOf(wp) === -1 && this.distance(frm, wp) > 1) {
          results.push(wp);
        }
      }
      return results;
    }).call(this);
    try {
      r = frm.findClosestByPath(waypoints, opts);
    } catch (_error) {
      e = _error;
      console.log(e);
      console.log(e.stack);
      return null;
    }
    return r;
  };

  return Waypointer;

})();

module.exports = Waypointer;

//# sourceMappingURL=waypointer.js.map
