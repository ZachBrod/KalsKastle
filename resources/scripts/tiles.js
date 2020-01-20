///////////
// FLOOR //
///////////
stage.tileIndex.push(Floor);
function Floor(x, y) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.sX = parseInt(x / TSIZE);
  this.sY = parseInt(y / TSIZE);
  this.sprite = new sprite(this, 0, 0, Floor.sheet);
  this.isBlocked = false;
}

Floor.sheet = new Image();
Floor.sheet.src = "resources/art/floor_spritesheet.png";
Floor.sheet.cellW = TSIZE;
Floor.sheet.cellH = TSIZE;
Floor.pixelColors = [];
Floor.pixelColors[0] = "255,255,255";
Floor.sheet.index = [0,1,2,3,4,5,6,6];

Floor.prototype.type = "floor";
Floor.prototype.isTile = true;
Floor.prototype.isActor = false;

Floor.prototype.wakeUp = function() {
  var BNC = 0; // binary neighbor count
  var adder = 1;
  var searchPath = [{x:-1, y:-1}, {x:0, y:-1}, {x:-1, y:0}];

  for (var i = 0; i < searchPath.length; i++) {
    if (stage.getTile(this.sX + searchPath[i].x, this.sY + searchPath[i].y).type == "wall") {
      BNC += adder;
    }
    adder *= 2;
  }

  if (this.sprite.sheet.index[BNC] != null) {
    this.sprite.source.x = this.sprite.sheet.index[BNC] * this.sprite.sheet.cellW;
  }

  this.sprite.source.y += RandomIntRange(0, 2) * this.sprite.sheet.cellH;
};




//////////
// WALL //
//////////
stage.tileIndex.push(Wall);
function Wall(x, y) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.sX = parseInt(x / TSIZE);
  this.sY = parseInt(y / TSIZE);
  this.sprite = new sprite(this, 0, 0, Wall.sheet);
  this.rigidBody = new rigidBody(this, null, null, {w:TSIZE, h:TSIZE}, "static");
  this.isBlocked = true;
}

Wall.sheet = new Image();
Wall.sheet.src = "resources/art/wall_spritesheet.png";
Wall.sheet.cellW = TSIZE;
Wall.sheet.cellH = TSIZE;
Wall.pixelColors = [];
Wall.pixelColors[0] = "0,0,0";

Wall.sheet.index = [0,0,1,1,0,0,1,1,2,2,3,4,2,2,3,4,5,5,6,6,5,5,7,7,8,8,9,10,8,8,
11,12,0,0,1,1,0,0,1,1,2,2,3,4,2,2,3,4,5,5,6,6,5,5,7,7,8,8,9,10,8,8,11,12,13,13,14,
14,13,13,14,14,15,15,16,17,15,15,16,17,18,18,19,19,18,18,20,20,21,21,22,23,21,21,
24,25,13,13,14,14,13,13,14,14,26,26,27,28,26,26,27,28,18,18,19,19,18,18,20,20,29,
29,30,31,29,29,32,33,0,0,1,1,0,0,1,1,2,2,3,4,2,2,3,4,5,5,6,6,5,5,7,7,8,8,9,10,8,
8,11,12,0,0,1,1,0,0,1,1,2,2,3,4,2,2,3,4,5,5,6,6,5,5,7,7,8,8,9,10,8,8,11,12,13,13,
14,14,13,13,14,14,15,15,16,17,15,15,16,17,34,34,35,35,34,34,36,36,37,37,38,39,37,
37,40,41,13,13,14,14,13,13,14,14,26,26,27,28,26,26,27,28,34,34,35,35,34,34,36,36,
42,42,43,44,42,42,45,46];

Wall.prototype.type = "wall";
Wall.prototype.isBlocked = true;
Wall.prototype.isTile = true;
Wall.prototype.isActor = false;

Wall.prototype.wakeUp = function() {
  var BNC = 0; // binary neighbor count
  var adder = 1;
  for (var y = this.sY - 1; y <= this.sY + 1; y++) {
    for (var x = this.sX - 1; x <= this.sX + 1; x++) {
      if (x != this.sX || y != this.sY) {
        if (stage.getTile(x, y).type == "wall") {
          BNC += adder;
        }
        adder *= 2;
      }
    }
  }

  if (this.sprite.sheet.index[BNC] != null) {
    this.sprite.source.x = this.sprite.sheet.index[BNC] * this.sprite.sheet.cellW;
    while (this.sprite.source.x >= this.sprite.sheet.width) {
      this.sprite.source.y += this.sprite.sheet.cellH;
      this.sprite.source.x -= this.sprite.sheet.width;
    }
  }
};




///////////
// Water //
///////////
stage.tileIndex.push(Water);
function Water(x, y) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.sX = parseInt(x / TSIZE);
  this.sY = parseInt(y / TSIZE);
  this.sprite = new sprite(this, 0, 0, Water.sheet);
  this.rigidBody = new rigidBody(this, null, null, {w:TSIZE, h:TSIZE}, "trigger");
  this.isBlocked = false;
  this.pull = [];
}

Water.sheet = new Image();
Water.sheet.src = "resources/art/water_spritesheet.png";
Water.sheet.cellW = TSIZE;
Water.sheet.cellH = TSIZE;

Water.anim = new animatron(Water);
Water.anim.lastUpdate = 0;
Water.anim.loop[0] = {x:TSIZE * 8 * 0, r:0.35};
Water.anim.loop[1] = {x:TSIZE * 8 * 1, r:0.35};
Water.anim.loop[2] = {x:TSIZE * 8 * 2, r:0.35};
Water.anim.loop[3] = {x:TSIZE * 8 * 3, r:0.35};

Water.pixelColors = [];
Water.pixelColors[0] = "0,0,255";

Water.prototype.type = "water";
Water.prototype.pullSpeed = 80;
Water.prototype.isTile = true;
Water.prototype.isActor = false;

Water.prototype.wakeUp = function() {
  var BNC = 0; // binary neighbor count
  var adder = 1;
  for (var y = this.sY - 1; y <= this.sY + 1; y++) {
    for (var x = this.sX - 1; x <= this.sX + 1; x++) {
      if (x != this.sX || y != this.sY) {
        if (stage.getTile(x, y).constructor == Water) {
          BNC += adder;
        }
        adder *= 2;
      }
    }
  }

  if (Wall.sheet.index[BNC] != null) {
    this.sprite.source.xOffset = Wall.sheet.index[BNC] * this.sprite.sheet.cellW;
    while (this.sprite.source.xOffset >= this.sprite.sheet.cellW * 7) {
      this.sprite.source.y += this.sprite.sheet.cellH;
      this.sprite.source.xOffset -= this.sprite.sheet.cellW * 7;
    }
  }

  //update this x based on offset right away.
  this.sprite.source.x = this.sprite.source.xOffset + Water.anim.loop[Water.anim.current].x;

  if (stage.getTile(this.sX, this.sY + 1).constructor != Water) { this.pull["up"] = true; } else { this.pull["up"] = false; }
  if (stage.getTile(this.sX, this.sY - 1).constructor != Water) { this.pull["down"] = true; } else { this.pull["down"] = false; }
  if (stage.getTile(this.sX + 1, this.sY).constructor != Water) { this.pull["left"] = true; } else { this.pull["left"] = false; }
  if (stage.getTile(this.sX - 1, this.sY).constructor != Water) { this.pull["right"] = true; } else { this.pull["right"] = false; }
};

Water.prototype.update = function() {
  if (Water.anim.lastUpdate != time.now) {
    Water.anim.lastUpdate = time.now;
    Water.anim.update();
  }
  this.sprite.source.x = this.sprite.source.xOffset + Water.anim.loop[Water.anim.current].x;
  this.sprite.source.y = this.sprite.source.y;
};

Water.prototype.hit = function(actor) {
  if (this.type == "water") {
    if (actor.type == "crate" && actor.x == this.x && actor.y == this.y) {
      this.type = "floor";
      this.isBlocked = false;
      this.sprite.source.y += this.sprite.sheet.cellH * 7;
      actor.kill(this);

      var tile = stage.getTile(this.sX, this.sY - 1);
      if (tile.constructor == Water) { tile.pull["up"] = true; }
      tile = stage.getTile(this.sX, this.sY + 1);
      if (tile.constructor == Water) { tile.pull["down"] = true; }
      tile = stage.getTile(this.sX - 1, this.sY);
      if (tile.constructor == Water) { tile.pull["left"] = true; }
      tile = stage.getTile(this.sX + 1, this.sY);
      if (tile.constructor == Water) { tile.pull["right"] = true; }
    } else

    if (actor.type === "pickup") {
      if (actor.kill != null) { actor.kill(this); }
    } else

    if ((actor.type == "player" || actor.constructor == IceBlock || actor.type == "enemy") && actor.constructor != Buzz) {
      if (actor.sX == this.sX && actor.sY == this.sY) {

        var tiles = stage.getTilesInside(actor.top, actor.bottom, actor.left, actor.right);
        var submerged = true;
        for (var x = 0; x < tiles.length && submerged === true; x++) {
          for (var y = 0; y < tiles[x].length && submerged === true; y++) {
            if (tiles[x][y].type != "water") { submerged = false; }
          }
        }

        if (submerged) {
          actor.rigidBody.velocity.x -= 4 * actor.rigidBody.velocity.x * time.deltaTime;
          actor.rigidBody.velocity.y -= 4 * actor.rigidBody.velocity.y * time.deltaTime;

          if (actor.constructor != IceBlock) {
            if (actor.kill != null) { actor.kill(this); }
          }
        } else {
          var overlap = physics.getOverlap(actor, this);

          var dirX = null;
          var dirY = null;
          if (overlap.x > 0) { dirX = "right"; } else { dirX = "left"; }
          if (overlap.y > 0) { dirY = "down"; } else { dirY = "up"; }
  
          var finalDir = null;
          if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
            if (this.pull[dirX] === true) { finalDir = dirX; } else { finalDir = dirY; }
          } else {
            if (this.pull[dirY] === true) { finalDir = dirY; } else { finalDir = dirX; }
          }

          var x = 0;
          var y = 0;
          if (finalDir === "up") { y = -1; } else
          if (finalDir === "down") { y = 1; } else
          if (finalDir === "left") { x = -1; } else
          if (finalDir === "right") { x = 1; }
        
          actor.rigidBody.velocity.x += x * Math.abs(overlap.x) * this.pullSpeed * time.deltaTime;
          actor.rigidBody.velocity.y += y * Math.abs(overlap.y) * this.pullSpeed * time.deltaTime;
        } // end if submerged
      } // end if same stage tile location
    } // end if actor is player or enemy
  } // end if this is water
};




////////////////////
// PRESSURE PLATE //
////////////////////
stage.tileIndex.push(PressurePlate);
function PressurePlate(x, y) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.sX = parseInt(x / TSIZE);
  this.sY = parseInt(y / TSIZE);
  this.sprite = new sprite(this, 0, 0, PressurePlate.sheet);
  this.isBlocked = false;
  this.state = "up";
}

PressurePlate.sheet = Floor.sheet;
PressurePlate.pixelColors = [];
PressurePlate.pixelColors[0] = "255,0,255";
PressurePlate.sheet.index = [0,1,2,3,4,5,6,6];

PressurePlate.prototype.type = "floor";
PressurePlate.prototype.isTile = true;
PressurePlate.prototype.isActor = false;

PressurePlate.prototype.wakeUp = function() {
  var BNC = 0; // binary neighbor count
  var adder = 1;
  var searchPath = [{x:-1, y:-1}, {x:0, y:-1}, {x:-1, y:0}];

  for (var i = 0; i < searchPath.length; i++) {
    if (stage.getTile(this.sX + searchPath[i].x, this.sY + searchPath[i].y).type == "wall") {
      BNC += adder;
    }
    adder *= 2;
  }

  if (PressurePlate.sheet.index[BNC] != null) {
    this.sprite.source.x = PressurePlate.sheet.index[BNC] * this.sprite.sheet.cellW;
  }

  this.sprite.source.y += 3 * this.sprite.sheet.cellH;
};



///////////////
// LEVELDOOR //
///////////////
stage.tileIndex.push(LevelDoor);
function LevelDoor(x, y) {
  this.x = x;
  this.y = y;
  this.z = 0;
  this.sX = parseInt(x / TSIZE);
  this.sY = parseInt(y / TSIZE);
  this.rigidBody = new rigidBody(this, null, null, {w:TSIZE, h:TSIZE}, "static");
  this.sprite = new sprite(this, 0, 0, LevelDoor.sheet);
  this.isBlocked = true;
  this.state = "closed";
  this.facing = null;
  this.curtain = null;
  this.type = "wall";
}

LevelDoor.sheet = new Image();
LevelDoor.sheet.src = "resources/art/leveldoor_spritesheet.png";
LevelDoor.sheet.cellW = TSIZE;
LevelDoor.sheet.cellH = TSIZE;
LevelDoor.pixelColors = [];
LevelDoor.pixelColors[0] = "0,255,0";
LevelDoor.plates = [];

LevelDoor.prototype.isTile = true;
LevelDoor.prototype.isActor = false;

LevelDoor.prototype.wakeUp = function() {
  LevelDoor.plates = [];
  for (var x = 0; x < stage.width; x++) {
    for (var y = 0; y < stage.height; y++) {
      var tile = stage.getTile(x, y);
      if (tile.constructor == PressurePlate) {
        LevelDoor.plates.push(tile);
      }
    }
  }

  if (this.state == "closed") {
    this.sprite.source.y = 0 * this.sprite.sheet.cellH;
  } else {
    this.sprite.source.y = 1 * this.sprite.sheet.cellH;
  }

  if (stage.getTile(this.sX, this.sY - 1).constructor != Wall) {
    this.facing = "up";
    this.sprite.source.x = 0 * this.sprite.sheet.cellW;
  } else

  if (stage.getTile(this.sX, this.sY + 1).constructor != Wall) {
    this.facing = "down";
    this.sprite.source.x = 3 * this.sprite.sheet.cellW;
  } else

  if (stage.getTile(this.sX - 1, this.sY).constructor != Wall) {
    this.facing = "left";
    this.sprite.source.x = 1 * this.sprite.sheet.cellW;
  } else

  if (stage.getTile(this.sX + 1, this.sY).constructor != Wall) {
    this.facing = "right";
    this.sprite.source.x = 2 * this.sprite.sheet.cellW;
  }
};

LevelDoor.prototype.update = function() {
  for (var i = 0; i < LevelDoor.plates.length; i++) {
    if(LevelDoor.plates[i].state == "up") {
      if (this.state == "open") {
        this.state = "closed";
        this.type = "wall";
        this.rigidBody.type = "static";
        this.sprite.source.y = 0 * this.sprite.sheet.cellH;
        for (var j = 0; j < physics.actors.length; j++) {
          if (physics.actors[j].sX === this.sX && physics.actors[j].sY === this.sY) {
            if (this.facing === "up") { physics.actors[j].y = this.top - physics.actors[j].height/2; }
            if (this.facing === "down") { physics.actors[j].y = this.bottom + physics.actors[j].height/2; }
            if (this.facing === "left") { physics.actors[j].x = this.left - physics.actors[j].width/2; }
            if (this.facing === "right") { physics.actors[j].x = this.right + physics.actors[j].width/2; }
          }
        }
      }
      return;
    }
  }

  if (this.state == "closed") {
    this.state = "open";
    this.type = "floor";
    this.rigidBody.type = "trigger";
    this.sprite.source.y = 1 * this.sprite.sheet.cellH;
  }
};

LevelDoor.prototype.hit = function(actor) {
  if (this.state == "open") {
    if (actor.type == "player") {
      if (this.facing == "up" && actor.top < this.top) { return; } 
      if (this.facing == "down" && actor.bottom > this.bottom) { return; }
      if (this.facing == "left" && actor.left < this.left) { return; }
      if (this.facing == "right" && actor.right > this.right) { return; }
      stage.currentLevel++;
      stage.levelTime = 0;
      stage.levelDeaths = 0;
      stage.closeCurtain();
    }
  }
};




/* Notes:
To keep things from getting confusing, let me lay out some basic ground rules.

First off, this is my personal understanding of Javascript, im sure many things are wrong.
This may not be the best or 'proper' way of doing things, but it's what works for me.

When dealing with objects, we have 3 different types we work with:
  1) The Constructor - This is a function that will be used as a tool to create new objects. Comparing it to C# or C++ this would be our class. Mind you, there is no reason this function should ever be called explicitly or directly, it should only be used as a target for creating new objects of its type. Also any member functions or variables added directly to the constructor but outside of its definition will not pass on to any new instantiations. This is because the instantiations are not actual copies of the original constructor object. The constructor object is just a function that "builds" new objects by targeting itself when run. Sometimes it can be useful to add members to the constructor object but outside its definition so as to not pass them on to children directly. Children can then later reference these constructor members directly, this is a way of simulating C# and C++ style static members.

  2) The Prototype - This is a parent object that is defined by Javascript itself. Comparing it to C# or C++ this would be Javascripts way of simulating inheritence. By adding new members to the prototype object we can create variables and methods that are shared by all objects derived from that prototype.

  3) New Instantiations - These are new objects that we create using our constructor function to populate it with data. The key here is that all objects instantiated from the constructor object will all share the same prototype.
*/