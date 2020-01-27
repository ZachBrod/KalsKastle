var UNDERFOOT = 0;
var ATEYE = 1;
var OVERHEAD = 2;



////////////
// TESTER //
////////////
Tester.pixelColors = [];
Tester.pixelColors[0] = "255,128,255";
stage.actorIndex.push(Tester);

function Tester(x, y) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "unit";
  this.isDead = false;
  this.sprite = new sprite(this, 0, 0, Tester.sheet);
  this.rigidBody = new rigidBody(this, 5, 5, {w:16, h:16}, "soft");
};

Tester.sheet = new Image();
Tester.sheet.src = "resources/art/tester_spritesheet.png";
Tester.sheet.cellW = 16;
Tester.sheet.cellH = 16;

Tester.prototype.isTile = false;
Tester.prototype.isActor = true;

Tester.prototype.lateUpdate = function() {
};

Tester.prototype.wakeUp = function() {
};

Tester.prototype.hit = function(actor) {
};

Tester.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




////////////
// PLAYER //
////////////
Player.pixelColors = [];
Player.pixelColors[0] = "255,0,0";
stage.actorIndex.push(Player);

function Player(x, y) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "player";
  this.isDead = false;
  this.sprite = new sprite(this, 0, -4.5, Player.sheet);
  this.rigidBody = new rigidBody(this, 5, 7, {w:12, h:12}, "soft");
  this.state = "idle";
  this.anim = new animatron();
  this.facing = "down";
  this.moveForce = 3000;
  this.inputQueue = [];
  this.pushToggle = false;
  this.ammo = 0;
  this.ammoText = null;
  this.setAnimation(this.state);
}

Player.sheet = new Image();
Player.sheet.src = "resources/art/player_spritesheet.png";
Player.sheet.cellW = 28;
Player.sheet.cellH = 29;

Player.prototype.isTile = false;
Player.prototype.isActor = true;

Player.prototype.wakeUp = function() {
  camera.focus = this;  

  input.registerNew ("up",    ["w", "W", "Up"]);
  input.registerNew ("down",  ["s", "S", "Down"]);
  input.registerNew ("left",  ["a", "A", "Left"]);
  input.registerNew ("right", ["d", "D", "Right"]);
  input.registerNew ("suicide", ["r", "R"]);
  input.registerNew ("fire", ["Spacebar", " "]);
};

Player.prototype.update = function() {
  if (this.pushToggle === false && this.state === "pushing") { this.state = "running"; }
  this.pushToggle = false;

  // Get movement direction.
  if (this.state != "dieing" && this.state != "drowning" && this.state != "shooting") {
    var x = 0;
    var y = 0;
    if (input.right.state) { x += 1; this.facing = "right";}
    if (input.left.state)  { x -= 1; this.facing = "left";}
    if (input.up.state)    { y -= 1; this.facing = "up";}
    if (input.down.state)  { y += 1; this.facing = "down";}

    // Input Buffer.
    var dir = ["right", "left", "up", "down"];
    for (var i = 0; i < dir.length; i++) {
      if (input[dir[i]].pressed) {
        if (input[dir[i]].state) {
          this.inputQueue.unshift(dir[i]);
        }
      }

      if (input[dir[i]].state === false) {
        for (var j = 0; j < this.inputQueue.length; j++) {
          if (this.inputQueue[j] === dir[i]) { this.inputQueue.splice(j, 1); }
        }
      }
    }
    if (this.inputQueue[0] != null) { this.facing = this.inputQueue[0]; }

    // Apply movement.
    if (x != 0 || y != 0) {
      if (this.state != "pushing") { this.state = "running"; }
      physics.applyForce(this.moveForce * time.deltaTime, x, y, this.rigidBody);
    } else {
      this.state = "idle";
    }

    if (input["fire"].pressed && this.ammo > 0) {
      this.state = "shooting";
      this.ammo -= 1;
      var ice = new IceBall(this.x, this.y, this);
      if (this.facing === "up") { ice.x += 2; } else
      if (this.facing === "down") { ice.x -= 2; } else
      if (this.facing === "left") { ice.y += 2; } else
      if (this.facing === "right") { ice.y += 2; }
    }
  }

  // Check for stage reset
  if (this.state === "shooting" && this.anim.current === 1) {
    this.state = "idle";
  }

  // Check for suicide
  if (input["suicide"].pressed && this.state != "dieing" && this.state != "drowning") {
    this.kill(this);
  }
  
  // Check for stage reset
  if ((this.state === "dieing" || this.state === "drowning") && this.anim.current === 7) {
    this.isDead = true;
    stage.closeCurtain();
  }

  if (input["dbug"].pressed && gameLoop.isInDBug === false) {
    this.addRemoveAmmo(1);
  }

  this.setAnimation(this.state);
  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

Player.prototype.hit = function(actor) {
  if (actor.rigidBody.type === "static" && (this.state === "running" || this.state === "pushing")) {
    var validPush = false;
    if (Math.abs(actor.x - this.x) > Math.abs(actor.y - this.y)) {
      if (actor.x > this.x) {
        if (this.facing === "right" && input.right.state) { validPush = true; }
      } else {
        if (this.facing === "left" && input.left.state) { validPush = true; }
      }
    } else {
      if (actor.y > this.y) {
        if (this.facing === "down" && input.down.state) { validPush = true; }
      } else {
        if (this.facing === "up" && input.up.state) { validPush = true; }
      }
    }
    if (validPush) {
      this.state = "pushing";
      this.pushToggle = true;
      if (actor.push != null) { actor.push(this); }
    }
  }
};

Player.prototype.addRemoveAmmo = function(amount) {
  this.ammo += amount;
  if (this.ammo >= 10) {
    this.ammo = 9;
  }
  if (this.ammo < 0) {
    this.ammo = 0;
  }

  if (this.ammoText === null) {
    //Ammo Text
    var style = {msg: "Ice",
                 font: "Bold 12px Consolas",
                 fill: "white",
                 stroke: "black",
                 lineWidth: 2,
                 shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}
    };
    this.ammoText = new HUDText(0, 0, 0, style);
    this.ammoText.parent = this;
    this.ammoText.update = function() {
      this.x = canvas.width - 38;
      this.y = canvas.height - 5;

      if (this.parent === null) {
        HUD.unRegister(this);
      } else {
        if (this.parent.ammo <= 0) {
          HUD.unRegister(this);
          this.parent.ammoText = null;
        } else {
          this.msg = this.parent.ammo.toString() + " Ice";
        }
      }
    };
    HUD.register(this.ammoText);
  }
}

Player.prototype.kill = function(killer) {
  if (this.isDead === false) {
    this.isDead = true;
    stage.levelDeaths += 1;
    stage.skipLevelCheck();
    physics.unRegisterActor(this);
    if (killer.constructor === Water) {
      this.state = "drowning";
    } else {
      this.rigidBody.velocity.x = 0;
      this.rigidBody.velocity.y = 0;
      this.state = "dieing";
    }
  }
};

Player.prototype.setAnimation = function(state) {
  if(this.anim.state === state && this.anim.direction === this.facing) { return false; }
  this.anim.state = state;
  this.anim.direction = this.facing;
  this.anim.loop = [];
  this.anim.time = 0;
  this.anim.rate = 0;
  this.anim.current = 0;
  var cellW = this.sprite.sheet.cellW;
  var cellH = this.sprite.sheet.cellH;

  switch (state) {
    case "idle":
      if (this.facing === "down")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:0}; } else
      if (this.facing === "up")    { this.anim.loop[0] = {x:cellW * 3, y:cellH * 0, r:0}; } else
      if (this.facing === "left")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 1, r:0}; } else
      if (this.facing === "right") { this.anim.loop[0] = {x:cellW * 0, y:cellH * 2, r:0}; }
      break;

    case "running":
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 0, r:0.2};
        this.anim.loop[2] = {x:cellW * 0, y:cellH * 0, r:0.2};
        this.anim.loop[3] = {x:cellW * 2, y:cellH * 0, r:0.2};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 3, y:cellH * 0, r:0.2};
        this.anim.loop[1] = {x:cellW * 4, y:cellH * 0, r:0.2};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 0, r:0.2};
        this.anim.loop[3] = {x:cellW * 5, y:cellH * 0, r:0.2};
      } else

      if(this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 1, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 1, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 1, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 1, r:0.12};
      } else

      if(this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 2, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 2, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 2, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 2, r:0.12};
      }
      break;

    case "pushing":
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 3, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 3, r:0.2};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 2, y:cellH * 3, r:0.2};
        this.anim.loop[1] = {x:cellW * 3, y:cellH * 3, r:0.2};
      } else

      if (this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 4, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 4, r:0.2};
      } else

      if (this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 2, y:cellH * 4, r:0.2};
        this.anim.loop[1] = {x:cellW * 3, y:cellH * 4, r:0.2};
      }
      break;

    case "shooting":
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 4, y:cellH * 3, r:0.3};
        this.anim.loop[1] = {x:cellW * 4, y:cellH * 3, r:0};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 4, y:cellH * 0, r:0.3};
        this.anim.loop[1] = {x:cellW * 4, y:cellH * 0, r:0};
      } else

      if (this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 4, y:cellH * 4, r:0.3};
        this.anim.loop[1] = {x:cellW * 4, y:cellH * 4, r:0};
      } else

      if (this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 5, y:cellH * 4, r:0.3};
        this.anim.loop[1] = {x:cellW * 5, y:cellH * 4, r:0};
      }
      break;

    case "dieing":
      this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:0.2};
      this.anim.loop[1] = {x:cellW * 0, y:cellH * 5, r:0.08};
      this.anim.loop[2] = {x:cellW * 1, y:cellH * 5, r:0.08};
      this.anim.loop[3] = {x:cellW * 2, y:cellH * 5, r:0.08};
      this.anim.loop[4] = {x:cellW * 3, y:cellH * 5, r:0.08};
      this.anim.loop[5] = {x:cellW * 4, y:cellH * 5, r:0.08};
      this.anim.loop[6] = {x:cellW * 5, y:cellH * 5, r:0.8};
      this.anim.loop[7] = {x:cellW * 5, y:cellH * 5, r:0};
      break;

    case "drowning":
      var rate = 0.07;
      this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:rate};
      this.anim.loop[1] = {x:cellW * 0, y:cellH * 6, r:rate};
      this.anim.loop[2] = {x:cellW * 1, y:cellH * 6, r:rate};
      this.anim.loop[3] = {x:cellW * 2, y:cellH * 6, r:rate};
      this.anim.loop[4] = {x:cellW * 3, y:cellH * 6, r:rate};
      this.anim.loop[5] = {x:cellW * 4, y:cellH * 6, r:rate};
      this.anim.loop[6] = {x:cellW * 5, y:cellH * 6, r:0.8};
      this.anim.loop[7] = {x:cellW * 5, y:cellH * 6, r:0};
      break;

    default:
      alert(state + " animation not found.");
      break;
  }
};




///////////
// CRATE //
///////////
Crate.pixelColors = [];
Crate.pixelColors[0] = "192,128,80";
stage.actorIndex.push(Crate);

function Crate(x, y) {
  this.x = x;
  this.y = y;
  this.z = UNDERFOOT;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  stage.getTile(this.sX, this.sY).isBlocked = true;
  this.type = "crate";
  this.isDead = false;
  this.sprite = new sprite(this, 0, 0, Crate.sheet);
  this.rigidBody = new rigidBody(this, 2, 5, {w:TSIZE, h:TSIZE}, "static");
  this.facing = null;
  this.state = null;
  this.pusher = null;
  this.slideTile = null;
  this.slideSpeed = 38;
}

Crate.sheet = new Image();
Crate.sheet.src = "resources/art/crate_spritesheet.png";
Crate.sheet.cellW = TSIZE;
Crate.sheet.cellH = TSIZE;

Crate.prototype.isTile = false;
Crate.prototype.isActor = true;

Crate.prototype.wakeUp = function() {
};

Crate.prototype.update = function() {
  if (this.state === "sliding") {
    var x = 0;
    var y = 0;

    if (this.facing === "up")    { y -= 1; } else
    if (this.facing === "down")  { y += 1; } else
    if (this.facing === "left")  { x -= 1; } else
    if (this.facing === "right") { x += 1; }

    if (this.pusher.state === "pushing" && this.pusher.facing === this.facing) {
      this.x += x * this.slideSpeed * time.deltaTime;
      this.y += y * this.slideSpeed * time.deltaTime;
      this.rigidBody.velocity.x += x * this.slideSpeed;
      this.rigidBody.velocity.y += y * this.slideSpeed;
      this.pusher.x += x * this.slideSpeed * time.deltaTime;
      this.pusher.y += y * this.slideSpeed * time.deltaTime;
    } else {
      this.x += x * this.slideSpeed * time.deltaTime * 0.6;
      this.y += y * this.slideSpeed * time.deltaTime * 0.6;
      this.rigidBody.velocity.x += x * this.slideSpeed * 0.6;
      this.rigidBody.velocity.y += y * this.slideSpeed * 0.6;
    }

    if ((this.facing === "down"  && this.y > this.slideTile.y)
    ||  (this.facing === "up"    && this.y < this.slideTile.y)
    ||  (this.facing === "right" && this.x > this.slideTile.x)
    ||  (this.facing === "left"  && this.x < this.slideTile.x)) {
      this.x = this.slideTile.x;
      this.y = this.slideTile.y;
      if (this.slideTile.constructor === PressurePlate) { this.slideTile.state = "down"; }
      this.facing = null;
      this.state = null;
      this.pusher = null;
      this.slideTile = null;
    }
  } else {
    this.rigidBody.velocity = {x:0, y:0};
  }
};

Crate.prototype.push = function(actor) {
  if (actor.state === "pushing" && this.state === null) {

    var validPush = false;
    // Check push direction
    if (Math.abs(actor.x - this.x) > Math.abs(actor.y - this.y)) {
      if (actor.x > this.x) {
        if (actor.facing === "left") { this.facing = "left"; validPush = true; }
      } else {
        if (actor.facing === "right") { this.facing = "right"; validPush = true; }
      }
    } else {
      if (actor.y > this.y) {
        if (actor.facing === "up") { this.facing = "up"; validPush = true; }
      } else {
        if (actor.facing === "down") { this.facing = "down"; validPush = true; }
      }
    }

    // Check for player alignment.
    if (validPush) {
      if (this.facing === "down" || this.facing === "up") {
        if (actor.left < this.left || actor.right > this.right) { validPush = false; }
      } else {
        if (actor.top < this.top || actor.bottom > this.bottom) { validPush = false; }
      }
    }

    // Get slide tile and check for walls
    if (validPush) {
      this.slideTile = {x: this.sX, y: this.sY};
      if (this.facing === "down")  { this.slideTile.y += 1; }
      if (this.facing === "up")    { this.slideTile.y -= 1; }
      if (this.facing === "right") { this.slideTile.x += 1; }
      if (this.facing === "left")  { this.slideTile.x -= 1; }
      this.slideTile = stage.getTile(this.slideTile.x, this.slideTile.y);
  
      if (this.slideTile.isBlocked) { validPush = false; }
    }

    // Check for other static actors.
    if (validPush) {
      for (var i = 0; i < physics.actors.length; i++) {
        if (physics.actors[i].rigidBody.type === "static" && physics.actors[i] != this) {
          var stageLoc = {x: physics.actors[i].sX, y: physics.actors[i].sY};
          if (stageLoc.x === this.slideTile.sX && stageLoc.y === this.slideTile.sY) {
            validPush = false;
            break;
          } else {
            if (physics.actors[i].slideTile != null) {
              if (physics.actors[i].slideTile.sX === this.slideTile.sX &&
                  physics.actors[i].slideTile.sY === this.slideTile.sY) {
                validPush = false;
                break;
              }
            }
          }
        }
      }
    }

    if (validPush) {
      var curTile = stage.getTile(this.sX, this.sY);
      if (curTile.constructor === PressurePlate) {
        curTile.state = "up";
      }
      curTile.isBlocked = false;
      this.slideTile.isBlocked = true;
      this.state = "sliding";
      this.pusher = actor;
    } else {
      this.facing = null;
      this.state = null;
      this.pusher = null;
      this.slideTile = null;
    }
  }
};

Crate.prototype.kill = function(killer) {
  stage.getTile(this.sX, this.sY).isBlocked = false;
  if (this.slideTile != null) { this.slideTile.isBlocked = false; }
  this.state = "dead";
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




////////////
// ARCHER //
////////////
Archer.pixelColors = [];
Archer.pixelColors[0] = "0,128,0";
stage.actorIndex.push(Archer);

function Archer(x, y, pixel) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "enemy";
  this.isDead = false;
  this.state = "ready";
  this.facing = "down";
  this.sprite = new sprite(this, 0, -3, Archer.sheet);
  this.rigidBody = new rigidBody(this, 0, 0, {w:14, h:14}, "static");
  this.anim = new animatron();
  this.minShootForce = 400;
  this.maxShootForce = 800;
  this.shootForcePer = 3;
  this.canFire = true;
  this.targetPlayer = null;
  this.arrows = [];
};

Archer.sheet = new Image();
Archer.sheet.src = "resources/art/archer_spritesheet.png";
Archer.sheet.cellW = 26;
Archer.sheet.cellH = 26;

Archer.prototype.isTile = false;
Archer.prototype.isActor = true;

Archer.prototype.wakeUp = function() {
  this.setAnimation();
  for (var i = 0; i < stage.actors.length; i++) {
    if (stage.actors[i].type === "player") {
      this.targetPlayer = stage.actors[i];
      break;
    }
  }
  stage.getTile(this.sX, this.sY).isBlocked = true;
};

Archer.prototype.update = function() {
  this.state = "ready";
  if (this.targetPlayer != null) {
    var diff = {x:this.targetPlayer.x - this.x, y:this.targetPlayer.y - this.y};
    if (Math.abs(diff.x) > Math.abs(diff.y)) {
      if (diff.x > 0) { this.facing = "right"; } else { this.facing = "left"; }
      if (this.targetPlayer.top < (this.sY + 1) * TSIZE && this.targetPlayer.bottom > this.sY * TSIZE) {
        this.state = "aim"
        if (this.targetPlayer.sY === this.sY) {
          this.state = "fire";
          this.fireCheck();
        }
      }
    } else {
      if (diff.y > 0) { this.facing = "down"; } else { this.facing = "up"; }
      if (this.targetPlayer.left < (this.sX + 1) * TSIZE && this.targetPlayer.right > this.sX * TSIZE) {
        this.state = "aim";
        if (this.targetPlayer.sX === this.sX) {
          this.state = "fire";
          this.fireCheck();
        }
      }
    }//if diffx > diffy
  }//if targetPlayer not null

  if (this.state != "fire") { this.canFire = true; }

  this.setAnimation();
  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

Archer.prototype.fireCheck = function() {
  if (this.canFire === false) { return false; }

/*
  // Check for actor block
  for(var i = 0; i < physics.actors.length; i++) {
    if(physics.actors[i] != this && physics.actors[i] != this.targetPlayer) {
      switch (this.facing) {
        case "up":
          if (physics.actors[i].sX === this.sX && physics.actors[i].sY < this.sY) { return false; }
          break;
        case "down":
          if (physics.actors[i].sX === this.sX && physics.actors[i].sY > this.sY) { return false; }
          break;
        case "left":
          if (physics.actors[i].sY === this.sY && physics.actors[i].sX < this.sX) { return false; }
          break;
        case "right":
          if (physics.actors[i].sY === this.sY && physics.actors[i].sX > this.sX) { return false; }
          break;
        default:
          debugger;
          break;
      }
    }
  }
*/

  //Check for wall block
  var x = this.sX;
  var y = this.sY;
  var currentTile = stage.getTile(x, y);
  var targetTile = stage.getTile(this.targetPlayer.sX, this.targetPlayer.sY);
  var offsetX = 0;
  var offsetY = 0;
  if (this.facing === "up") { offsetY = -1; } else 
  if (this.facing === "down") { offsetY = 1; } else 
  if (this.facing === "left") { offsetX = -1; } else 
  if (this.facing === "right") { offsetX = 1; }
  while(currentTile != targetTile) {
    x += offsetX;
    y += offsetY;
    currentTile = stage.getTile(x, y);
    if (currentTile.isBlocked) {
      return false;
    }
  }

  // Check for close crate block
  for (var i = 0; i < physics.actors.length; i++) {
    if (physics.actors[i].constructor === Crate) {
      if (this.targetPlayer.sX === physics.actors[i].sX && this.targetPlayer.sY === physics.actors[i].sY) {
        return false;
      }
    }
  }

  // If we haven’t returned false yet
  var x = 0;
  var y = 0;
  if (this.facing === "up") { y = -1; } else 
  if (this.facing === "down") { y = 1; } else 
  if (this.facing === "left") { x = -1; } else 
  if (this.facing === "right") { x = 1; }

  this.arrows.push(new Arrow(this.x, this.y, this));
  this.arrows[this.arrows.length-1].wakeUp();
  if (this.arrows.length > 4) { 
    if (this.arrows[0] != null) { this.arrows[0].kill(this); }
    this.arrows.shift();
  }

  if (this.facing === "up" || this.facing === "down") {
    var adjustedForce =  Math.abs(this.y - this.targetPlayer.y) * this.shootForcePer; 
  } else {
    var adjustedForce =  Math.abs(this.x - this.targetPlayer.x) * this.shootForcePer;
  }
  if (adjustedForce < this.minShootForce) { adjustedForce = this.minShootForce; }
  if (adjustedForce > this.maxShootForce) { adjustedForce = this.maxShootForce; }

  physics.applyForce(adjustedForce, x, y, this.arrows[this.arrows.length-1].rigidBody);
  this.canFire = false;
  return true;
};

Archer.prototype.setAnimation = function() {
  if(this.anim.state === this.state && this.anim.direction === this.facing) { return false; }
  this.anim.state = this.state;
  this.anim.direction = this.facing;
  this.anim.loop = [];
  this.anim.time = 0;
  this.anim.rate = 0;
  this.anim.current = 0;
  var cellW = this.sprite.sheet.cellW;
  var cellH = this.sprite.sheet.cellH;

  this.anim.loop[0] = {x:0, y:0, r:0};

  if (this.facing === "down")  { this.anim.loop[0].y = cellH * 0; } else 
  if (this.facing === "up")    { this.anim.loop[0].y = cellH * 1; } else 
  if (this.facing === "left")  { this.anim.loop[0].y = cellH * 2; } else 
  if (this.facing === "right") { this.anim.loop[0].y = cellH * 3; }

  switch (this.state) {
    case "ready":
      this.anim.loop[0].x = cellW * 0;
      break;
    case "aim":
      this.anim.loop[0].x = cellW * 1;
      break;
    case "fire":
      this.anim.loop[0].x = cellW * 2;
      break;
    default:
      debugger;
  }
};

Archer.prototype.hit = function(actor) {
};

Archer.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




///////////
// ARROW //
///////////
function Arrow(x, y, firer) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "projectile";
  this.isDead = false;
  this.sprite = new sprite(this, 0, 0, Arrow.sheet);
  this.rigidBody = new rigidBody(this, 1, 0, {w:3, h:3}, "trigger");
  this.firer = firer;
  this.facing = firer.facing;
  this.hitTarget = null;
};

Arrow.sheet = new Image();
Arrow.sheet.src = "resources/art/arrow_spritesheet.png";
Arrow.sheet.cellW = 19;
Arrow.sheet.cellH = 25;

Arrow.prototype.isTile = false;
Arrow.prototype.isActor = true;

Arrow.prototype.lateUpdate = function() {
  if (this.hitTarget === null) {
    if (this.firer != null && this.firer.targetPlayer != null) {
      var targ = this.firer.targetPlayer;
      if (this.facing === "up" || this.facing === "down") {
        var distance = Math.abs(this.y - targ.y);
        var velocity = Math.abs(this.rigidBody.velocity.y);
        var travelTime = (distance/velocity);
        var playerFuture = targ.x + targ.rigidBody.velocity.x * travelTime;

        //clamp to grid
        if (playerFuture - (this.width/2) < this.firer.sX * TSIZE) { playerFuture = this.firer.sX * TSIZE + (this.width/2) + 0.01; } else
        if (playerFuture + (this.width/2) > (this.firer.sX + 1) * TSIZE) { playerFuture = (this.firer.sX + 1) * TSIZE - (this.width/2) - 0.01; }

        this.rigidBody.velocity.x = (playerFuture - this.x) / travelTime;
      } else {
        var distance = Math.abs(this.x - targ.x);
        var velocity = Math.abs(this.rigidBody.velocity.x);
        var travelTime = (distance/velocity);
        var playerFuture = targ.y + targ.rigidBody.velocity.y * travelTime;

        //clamp to grid
        if (playerFuture - (this.height/2) < this.firer.sY * TSIZE) { playerFuture = this.firer.sY * TSIZE + (this.height/2) + 0.01; } else
        if (playerFuture + (this.height/2) > (this.firer.sY + 1) * TSIZE) { playerFuture = (this.firer.sY + 1) * TSIZE - (this.height/2) - 0.01; }

        this.rigidBody.velocity.y = (playerFuture - this.y) / travelTime;
      }
    }
  } else {
    var actorFound = false;
    for (var i = 0; i < stage.actors.length && actorFound === false; i++) {
      if (stage.actors[i] === this.hitTarget.actor) {
        actorFound = true;
      }
    }
    if (actorFound === false) {
      this.kill(this);
    }

    if (this.hitTarget.actor != null) {
      this.x = this.hitTarget.actor.x + this.hitTarget.offsetX;
      this.y = this.hitTarget.actor.y + this.hitTarget.offsetY;

      while (this.hitTarget.facing != this.hitTarget.actor.facing && this.hitTarget.actor.constructor != Crate) {
        var cardDir = ["up", "right", "down", "left"];
        for (var i = 0; i < cardDir.length; i++) {
          if (cardDir[i] === this.hitTarget.facing) {
            i += 1;
            if (i === cardDir.length) { i = 0; }
            this.hitTarget.facing = cardDir[i];
            for (var j = 0; j < cardDir.length; j++) {
              if (cardDir[j] === this.facing) {
                j += 1;
                if (j === cardDir.length) { j = 0; }
                this.facing = cardDir[j];
                this.updateBody();
                break;
              }
            }
            var temp = this.hitTarget.offsetY;
            this.hitTarget.offsetY = this.hitTarget.offsetX;
            this.hitTarget.offsetX = temp * -1;
            break;
          }
        }
      }
    }
  }
};

Arrow.prototype.wakeUp = function() {
  this.updateBody();

  stage.registerActor(this);
  physics.registerActor(this);
};

Arrow.prototype.updateBody = function() {
  if (this.facing === "up") {
    this.sprite.source.x = 0 * this.sprite.sheet.cellW;
    this.rigidBody.collider.h = 10;
    this.sprite.offset.y = 0.5;
  } else
  if (this.facing === "down") {
    this.sprite.source.x = 1 * this.sprite.sheet.cellW;
    this.rigidBody.collider.h = 10;
    this.sprite.offset.y = 4.5;
  } else
  if (this.facing === "left") {
    this.sprite.source.x = 2 * this.sprite.sheet.cellW;
    this.rigidBody.collider.w = 10;
    this.sprite.offset.x = -3;
  } else
  if (this.facing === "right") {
    this.sprite.source.x = 3 * this.sprite.sheet.cellW;
    this.rigidBody.collider.w = 10;
    this.sprite.offset.x = 3;
  }
}

Arrow.prototype.hit = function(actor) {
  if (actor != this.firer && actor.rigidBody.type != "trigger" && actor.type != "projectile" && actor.type != "pickup") {
    if (actor.type === "player") { actor.kill(this); }
    if (actor.constructor === Buzz) { this.kill(actor); }

    if (this.facing === "up")    { this.y = actor.bottom + (this.height/2); } else
    if (this.facing === "down")  { this.y = actor.top    - (this.height/2); } else
    if (this.facing === "left")  { this.x = actor.right  + (this.width/2); } else
    if (this.facing === "right") { this.x = actor.left   - (this.width/2); }

    this.hitTarget = new Object();
    this.hitTarget.actor = actor;
    this.hitTarget.facing = actor.facing;
    this.hitTarget.offsetX = this.x - this.hitTarget.actor.x;
    this.hitTarget.offsetY = this.y - this.hitTarget.actor.y;

    physics.unRegisterActor(this);
  }
};

Arrow.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




////////////
// KNIGHT //
////////////
Knight.pixelColors = [];
Knight.pixelColors[0] = "255,128,0";
Knight.pixelColors[1] = "255,192,0";
stage.actorIndex.push(Knight);

function Knight(x, y, pixel) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.sprite = new sprite(this, 0, -1.5, Knight.sheet);
  this.rigidBody = new rigidBody(this, 5, 7, {w:12, h:12}, "soft");
  this.anim = new animatron();
  if (pixel === Knight.pixelColors[0]) { this.hand = "left"; }
  if (pixel === Knight.pixelColors[1]) { this.hand = "right"; }
  this.state = "idle";
  this.type = "enemy";
  this.isDead = false;
  this.facing = "down";
  this.targetPlayer = null;
  this.lastLookFrom = null;
  this.lastLookTo = null;
  this.canSeePlayer = false;
  this.playerLastSeen = null;
  this.idleTimer = {cur: 0, max: 2.0};
  this.moveForce = this.walkForce;
  this.wayPoints = [];
  this.lastHandChange = 0;
}

Knight.sheet = new Image();
Knight.sheet.src = "resources/art/knight_spritesheet.png";
Knight.sheet.cellW = 28;
Knight.sheet.cellH = 30;

Knight.prototype.isTile = false;
Knight.prototype.isActor = true;
Knight.prototype.walkForce = 1300;
Knight.prototype.runForce = 2600;

function PathNode(tile, prev, distance, heuristic) {
  this.tile = tile;
  this.prev = prev;
  this.distance = distance;
  this.heuristic = heuristic || 0;
}

Knight.prototype.wakeUp = function() {
  this.setAnimation(this.state);
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;

  for (var i = 0; i < stage.actors.length; i++) {
    if (stage.actors[i].type === "player") {
      this.targetPlayer = stage.actors[i];
      break;
    }
  }
};

Knight.prototype.update = function() {
  switch (this.state) {
    case "idle":
      this.lookForPlayer();
      this.idleTimer.cur += time.deltaTime;
      if (this.idleTimer.cur > this.idleTimer.max) {
        this.idleTimer.cur -= this.idleTimer.max;

        if (this.findPatrolPath() === true) {
          this.state = "patrolling";
        } else {
          var direction = ["up", "down", "left", "right"];
          this.facing = direction[RandomIntRange(0, 3)];
        }
      }
      if (this.canSeePlayer === true) {
        this.findPathToPlayer();
      }
      break;

    case "patrolling":
      this.lookForPlayer();
      if (this.canSeePlayer) {
        this.wayPoints = [];
        this.findPathToPlayer();
      } else {
        if (this.wayPoints.length > 0) {
          if (this.sX === this.wayPoints[0].sX && this.sY === this.wayPoints[0].sY) {
            this.wayPoints.shift();
          }
        }
        if (this.wayPoints.length === 0) { this.findPatrolPath(); }
        if (this.wayPoints.length != 0) { this.goTo(this.wayPoints[0]); }
      }
      break;

    case "chasing":
      if (this.targetPlayer.isDead) {
        this.wayPoints = [];
        if (this.findPatrolPath() === true) {
          this.state = "patrolling";
        } else {
          this.state = "idle";
        }
      } else

      if (this.sX === this.targetPlayer.sX && this.sY === this.targetPlayer.sY ) {
        this.goTo(this.targetPlayer);
      } else {
        this.lookForPlayer();
        if (this.canSeePlayer) { this.findPathToPlayer(); }

        if (this.wayPoints.length > 0) {
          if (this.sX === this.wayPoints[0].sX && this.sY === this.wayPoints[0].sY) {
            if (this.wayPoints.length > 1) {
              this.wayPoints.shift();
              this.goTo(this.wayPoints[0]);
            } else {
              this.findPatrolPath();
            }
          } else {
            this.goTo(this.wayPoints[0]);
          }
        } else {
          this.findPatrolPath();
        }
      }
      break;

    case "watching":
      if (this.targetPlayer.isDead) {
        this.wayPoints = [];
        if (this.findPatrolPath() === true) {
          this.state = "patrolling";
        } else {
          this.state = "idle";
        }
      } else

      this.face(this.targetPlayer);
      if (this.targetPlayer.sX != this.playerLastSeen.sX || this.targetPlayer.sY != this.playerLastSeen.sY) {
        this.lookForPlayer();
        if (this.canSeePlayer) {
          this.findPathToPlayer();
          if (this.wayPoints.length > 0) {
            if (this.sX != this.wayPoints[this.wayPoints.length - 1].sX || this.sY != this.wayPoints[this.wayPoints.length - 1].sY) {
              this.state = "chasing";
            }
          }
        } else {
          this.findPatrolPath();
        }
      } 
      break;

    case "attacking":
      if (this.anim.current === 4) { this.state = "idle"; }
      break;

    case "dieing":
    case "drowning":
      if (this.anim.current === 7) { 
        this.isDead = true;
        stage.unRegisterActor(this);
        physics.unRegisterActor(this);
      }
      break;

    default:
      console.log("Knight state not found - " + this.state + ".");
      break;
  }

  this.setAnimation(this.state);
  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

Knight.prototype.goTo = function(target) {
  this.face(target);

  // Move towards target
  if (this.state === "patrolling") {
    physics.applyForce(this.moveForce * time.deltaTime, target.x - this.x, target.y - this.y, this.rigidBody);
  } else {
    physics.applyForce((this.moveForce * 2) * time.deltaTime, target.x - this.x, target.y - this.y, this.rigidBody);
  }
};

Knight.prototype.face = function(target) {
  if (Math.abs(this.x - target.x) > Math.abs(this.y - target.y)) {
    if (this.x - target.x > 0) { this.facing = "left"; } else { this.facing = "right"; } 
  } else {
    if (this.y - target.y > 0) { this.facing = "up"; } else { this.facing = "down"; } 
  }
}

Knight.prototype.lookForPlayer = function() {
  if (this.targetPlayer.isDead) {
    this.canSeePlayer = false;
    return;
  }

  if (this.lastLookFrom === stage.getTile(this.sX, this.sY) && 
      this.lastLookTo === stage.getTile(this.targetPlayer.sX, this.targetPlayer.sY)) {
    return;
  }
  this.lastLookFrom = stage.getTile(this.sX, this.sY);
  this.lastLookTo = stage.getTile(this.targetPlayer.sX, this.targetPlayer.sY);

  var maxviewDistance = 10;
  var diffX = this.targetPlayer.x - this.x;
  var diffY = this.targetPlayer.y - this.y;

  if (this.state === "chasing" || this.state === "watching") {
    var inFOV = true;
  } else {
    var inFOV = false;

    if (this.facing === "up"   ) { if (diffY < 0 && Math.abs(diffY) > Math.abs(diffX)/2) { inFOV = true; } } else 
    if (this.facing === "down" ) { if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX)/2) { inFOV = true; } } else 
    if (this.facing === "left" ) { if (diffX < 0 && Math.abs(diffX) > Math.abs(diffY)/2) { inFOV = true; } } else 
    if (this.facing === "right") { if (diffX > 0 && Math.abs(diffX) > Math.abs(diffY)/2) { inFOV = true; } }
  }

  if (inFOV) {
    if (Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2)) / TSIZE > maxviewDistance) {
      this.canSeePlayer = false;
      return;
    }

    var ray = physics.rayTrace(this.sX, this.sY, this.targetPlayer.sX, this.targetPlayer.sY);

    for (var i = 0; i < ray.length; i++) {
      if (ray[i].isBlocked === true) {
        this.canSeePlayer = false;
        return;
      }
    }

    this.playerLastSeen = stage.getTile(this.targetPlayer.sX, this.targetPlayer.sY);
    this.canSeePlayer = true;
  } else {
    this.canSeePlayer = false;
  }
};

Knight.prototype.findPathToPlayer = function() {
  if (this.wayPoints.length > 0) {
    if (this.wayPoints[this.wayPoints.length - 1].sX === this.playerLastSeen.sX &&
      this.wayPoints[this.wayPoints.length - 1].sY === this.playerLastSeen.sY ) {
      return true;
    }
  }

  if (this.sX === this.targetPlayer.sX && this.sY === this.targetPlayer.sY ) {
    this.state = "chasing";
    this.wayPoints = [];
    this.wayPoints.push(stage.getTile(this.sX, this.sY));
    return true;
  }

  this.wayPoints = [];
  var maxSearchDistance = 50;
  var targetNode = null;

  var open = [];
  var closed = [];
  open.push(new PathNode(stage.getTile(this.sX, this.sY), null, 0, Math.abs(this.sX - this.targetPlayer.sX) + Math.abs(this.sY - this.targetPlayer.sY)));

  while (open.length > 0) {
    var lN = 0; // lowest node
    for (var i = 0; i < open.length; i++) {
      if (open[i].distance + open[i].heuristic < open[lN].distance + open[lN].heuristic) { lN = i; }
    }

    if (open[lN].distance < maxSearchDistance) {
      var frontier = [];

      // add perpendiculars
      frontier.push(new PathNode(stage.getTile(open[lN].tile.sX, open[lN].tile.sY - 1), open[lN], open[lN].distance + 1, 
      Math.abs(open[lN].tile.sX - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY - 1) - this.targetPlayer.sY)));

      frontier.push(new PathNode(stage.getTile(open[lN].tile.sX, open[lN].tile.sY + 1), open[lN], open[lN].distance + 1, 
      Math.abs(open[lN].tile.sX - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY + 1) - this.targetPlayer.sY)));

      frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY), open[lN], open[lN].distance + 1, 
      Math.abs((open[lN].tile.sX - 1) - this.targetPlayer.sX) + Math.abs(open[lN].tile.sY - this.targetPlayer.sY)));

      frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY), open[lN], open[lN].distance + 1, 
      Math.abs((open[lN].tile.sX + 1) - this.targetPlayer.sX) + Math.abs(open[lN].tile.sY - this.targetPlayer.sY)));

      // add top diagonals
      if (frontier[0].tile.isBlocked != true && frontier[0].tile.type != "water") {
        if (frontier[2].tile.isBlocked != true && frontier[2].tile.type != "water") {
          frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY - 1), open[lN], open[lN].distance + Math.SQRT2, 
          Math.abs((open[lN].tile.sX - 1) - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY - 1) - this.targetPlayer.sY)));
        }
        if (frontier[3].tile.isBlocked != true && frontier[3].tile.type != "water") {
          frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY - 1), open[lN], open[lN].distance + Math.SQRT2, 
          Math.abs((open[lN].tile.sX + 1) - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY - 1) - this.targetPlayer.sY)));
        }
      }

      // add bottom diagonals
      if (frontier[1].tile.isBlocked != true && frontier[1].tile.type != "water") {
        if (frontier[2].tile.isBlocked != true && frontier[2].tile.type != "water") {
          frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY + 1), open[lN], open[lN].distance + Math.SQRT2, 
          Math.abs((open[lN].tile.sX - 1) - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY + 1) - this.targetPlayer.sY)));
        }
        if (frontier[3].tile.isBlocked != true && frontier[3].tile.type != "water") {
          frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY + 1), open[lN], open[lN].distance + Math.SQRT2, 
          Math.abs((open[lN].tile.sX + 1) - this.targetPlayer.sX) + Math.abs((open[lN].tile.sY + 1) - this.targetPlayer.sY)));
        }
      }

      for (var i = 0; i < frontier.length; i++) {
        if (frontier[i].tile.isBlocked === true ||
            frontier[i].tile.type === "water") {
          continue;
        }

        for (var j = 0; j < open.length; j++) {
          if (frontier[i].tile === open[j].tile) { break; }
        }
        if (j != open.length) { continue; }

        for (var j = 0; j < closed.length; j++) {
          if (frontier[i].tile === closed[j].tile) { break; }
        }
        if (j != closed.length) { continue; }

        open.push(frontier[i]);
      }
    }

    closed.push(open[lN]);
    open.splice(lN, 1);

    if (closed[closed.length-1].tile.sX === this.playerLastSeen.sX && closed[closed.length-1].tile.sY === this.playerLastSeen.sY) {
      targetNode = closed[closed.length-1];
      break;
    }
  }
  
  //Knight is trapped into a single square space.
  if (closed.length === 0) {
    this.wayPoints = [];
    if (this.canSeePlayer) {
      this.face(this.targetPlayer);
      this.state = "watching";
    } else {
      this.state = "idle";
    }
    return false;
  }

  //Path to player is either too long or there is no route.
  //Find closest node to player instead.
  if (targetNode === null) {
    var closestToPlayer = 0;
    for (var i = 0; i < closed.length; i++) {
      if (closed[i].heuristic < closed[closestToPlayer].heuristic) { closestToPlayer = i; }
    }
    targetNode = closed[closestToPlayer];
  }

  this.wayPoints = [];
  this.state = "chasing";

  if (this.sX === targetNode.tile.sX && this.sY === targetNode.tile.sY) {
    this.face(this.targetPlayer);
    this.state = "watching";
    return false;
  }

  while (targetNode != null) {
    this.wayPoints.unshift(targetNode.tile);
    targetNode = targetNode.prev;
  }

  return true;
}

Knight.prototype.findPatrolPath = function() {

  //Check if there is a wall nearby
  var wallFound = false;
  for (var y = this.sY - 1; y <= this.sY + 1 && wallFound === false; y++) {
    for (var x = this.sX - 1; x <= this.sX + 1 && wallFound === false; x++) {
      if (x != this.sX || y != this.sY) {
        if (stage.getTile(x, y).isBlocked === true || stage.getTile(x, y).type === "water") {
          wallFound = true;
        }
      }
    }
  }

  if (wallFound === true) {

    var directions = [];
    if (this.hand === "left") {
      directions["up"] =    [{x:-1, y: 0}, {x:-1, y: 1}];
      directions["down"] =  [{x: 1, y: 0}, {x: 1, y:-1}];
      directions["left"] =  [{x: 0, y: 1}, {x: 1, y: 1}];
      directions["right"] = [{x: 0, y:-1}, {x:-1, y:-1}];
    } else if (this.hand === "right") {
      directions["up"] =    [{x: 1, y: 0}, {x: 1, y: 1}];
      directions["down"] =  [{x:-1, y: 0}, {x:-1, y:-1}];
      directions["left"] =  [{x: 0, y:-1}, {x: 1, y:-1}];
      directions["right"] = [{x: 0, y: 1}, {x:-1, y: 1}];
    }

    var spin = [];
    if (this.hand === "left") {
      spin["up"] = "right";
      spin["down"] = "left";
      spin["left"] = "up";
      spin["right"] = "down";
    } else if (this.hand === "right") {
      spin["up"] = "left";
      spin["down"] = "right";
      spin["left"] = "down";
      spin["right"] = "up";
    }

    //Check if there is a wall the knight can follow
    var handOnWall = false;
    for (var i = 0; i < 4 && handOnWall === false; i++) {
      handOnWall = false;
      for (var j = 0; j < directions[this.facing].length; j++) {
        var tile = stage.getTile(this.sX + directions[this.facing][j].x, this.sY + directions[this.facing][j].y);
        if (tile.isBlocked === true || tile.type === "water") {
          handOnWall = true;
          break;
        }
      }

      if (handOnWall === false) {
        this.facing = spin[this.facing];
      }
    }
    // Wall not found? This should never run.
    if (i === 4) {
      this.findClosestWall();
      return true;
    }

    this.wayPoints = [];
    var searchCount = 0;
    for (var i = 0; i < 4 && this.wayPoints.length === 0; i++) {
      var tile = stage.getTile(this.sX + directions[this.facing][0].x, this.sY + directions[this.facing][0].y);
      if (tile.isBlocked === true || tile.type === "water") {
        this.facing = spin[this.facing];
      } else {
        this.wayPoints.unshift(tile);
      }
    }
    // Knight is trapped in 1 by 1 square
    if (this.wayPoints.length === 0) {
      this.state = "idle";
      return false;
    }

  } else {
    this.findClosestWall();
  }

  this.state = "patrolling";
  return true;
};

Knight.prototype.findClosestWall = function() {
  var targetNode = null;
  var open = [];
  var closed = [];
  var frontier = [];
  open.push(new PathNode(stage.getTile(this.sX, this.sY), null, 0));

  while (open.length > 0) {
    var lN = 0; // lowest node
    for (var i = 0; i < open.length; i++) {
      if (open[i].distance < open[lN].distance) { lN = i; }
    }

    // add perpendiculars
    frontier.push(new PathNode(stage.getTile(open[lN].tile.sX, open[lN].tile.sY - 1), open[lN], open[lN].distance + 1));
    frontier.push(new PathNode(stage.getTile(open[lN].tile.sX, open[lN].tile.sY + 1), open[lN], open[lN].distance + 1));
    frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY), open[lN], open[lN].distance + 1));
    frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY), open[lN], open[lN].distance + 1));

    // add top diagonals
    if (frontier[0].tile.isBlocked != true && frontier[0].tile.type != "water") {
      if (frontier[2].tile.isBlocked != true && frontier[2].tile.type != "water") {
        frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY - 1), open[lN], open[lN].distance + Math.SQRT2));
      }
      if (frontier[3].tile.isBlocked != true && frontier[3].tile.type != "water") {
        frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY - 1), open[lN], open[lN].distance + Math.SQRT2));
      }
    }

    // add bottom diagonals
    if (frontier[1].tile.isBlocked != true && frontier[1].tile.type != "water") {
      if (frontier[2].tile.isBlocked != true && frontier[2].tile.type != "water") {
        frontier.push(new PathNode(stage.getTile(open[lN].tile.sX - 1, open[lN].tile.sY + 1), open[lN], open[lN].distance + Math.SQRT2));
      }
      if (frontier[3].tile.isBlocked != true && frontier[3].tile.type != "water") {
        frontier.push(new PathNode(stage.getTile(open[lN].tile.sX + 1, open[lN].tile.sY + 1), open[lN], open[lN].distance + Math.SQRT2));
      }
    }

    for (var i = 0; i < frontier.length; i++) {
      for (var j = 0; j < open.length; j++) {
        if (frontier[i].tile === open[j].tile) { break; }
      }
      if (j != open.length) { continue; }

      for (var j = 0; j < closed.length; j++) {
        if (frontier[i].tile === closed[j].tile) { break; }
      }
      if (j != closed.length) { continue; }

      open.push(frontier[i]);
    }

    closed.push(open[lN]);
    open.splice(lN, 1);

    if (closed[closed.length-1].tile.isBlocked === true || closed[closed.length-1].tile.type === "water") {
      targetNode = closed[closed.length-1];
      break;
    }
  }

  targetNode = targetNode.prev;
  this.wayPoints = [];
  this.state = "patrolling";

  while (targetNode != null) {
    this.wayPoints.unshift(targetNode.tile);
    targetNode = targetNode.prev;
  }

  return true;
};

Knight.prototype.setAnimation = function(state) {
if(this.anim.state === state && this.anim.direction === this.facing) { return false; }
  this.anim.state = state;
  this.anim.direction = this.facing;
  this.anim.loop = [];
  this.anim.time = 0;
  this.anim.rate = 0;
  this.anim.current = 0;
  var cellW = this.sprite.sheet.cellW;
  var cellH = this.sprite.sheet.cellH;

  switch (state) {
    case "idle":
      if (this.facing === "down")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:0}; }
      if (this.facing === "up")    { this.anim.loop[0] = {x:cellW * 0, y:cellH * 1, r:0}; }
      if (this.facing === "left")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 2 , r:0}; }
      if (this.facing === "right") { this.anim.loop[0] = {x:cellW * 0, y:cellH * 3, r:0}; }
      break;

    case "patrolling":
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 0, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 0, r:0.2};
        this.anim.loop[2] = {x:cellW * 0, y:cellH * 0, r:0.2};
        this.anim.loop[3] = {x:cellW * 2, y:cellH * 0, r:0.2};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 1, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 1, r:0.2};
        this.anim.loop[2] = {x:cellW * 0, y:cellH * 1, r:0.2};
        this.anim.loop[3] = {x:cellW * 2, y:cellH * 1, r:0.2};
      } else

      if(this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 2, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 2, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 2, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 2, r:0.12};
      } else

      if(this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 3, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 3, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 3, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 3, r:0.12};
      }
      break;

    case "chasing":
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 4, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 4, r:0.2};
        this.anim.loop[2] = {x:cellW * 0, y:cellH * 4, r:0.2};
        this.anim.loop[3] = {x:cellW * 2, y:cellH * 4, r:0.2};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 1, r:0.2};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 1, r:0.2};
        this.anim.loop[2] = {x:cellW * 0, y:cellH * 1, r:0.2};
        this.anim.loop[3] = {x:cellW * 2, y:cellH * 1, r:0.2};
      } else

      if(this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 5, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 5, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 5, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 5, r:0.12};
      } else

      if(this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 1, y:cellH * 6, r:0.12};
        this.anim.loop[1] = {x:cellW * 2, y:cellH * 6, r:0.12};
        this.anim.loop[2] = {x:cellW * 3, y:cellH * 6, r:0.12};
        this.anim.loop[3] = {x:cellW * 4, y:cellH * 6, r:0.12};
      }
      break;

    case "attacking":
      var rate = 0.08;
      if (this.facing === "down") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 7, r:rate};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 7, r:rate};
        this.anim.loop[2] = {x:cellW * 2, y:cellH * 7, r:rate};
        this.anim.loop[3] = {x:cellW * 0, y:cellH * 0, r:1.0};
        this.anim.loop[4] = {x:cellW * 0, y:cellH * 0, r:0};
      } else

      if (this.facing === "up") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 8, r:rate};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 8, r:rate};
        this.anim.loop[2] = {x:cellW * 2, y:cellH * 8, r:rate};
        this.anim.loop[3] = {x:cellW * 0, y:cellH * 1, r:1.0};
        this.anim.loop[4] = {x:cellW * 0, y:cellH * 1, r:0};
      } else

      if(this.facing === "left") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 9, r:rate};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 9, r:rate};
        this.anim.loop[2] = {x:cellW * 2, y:cellH * 9, r:rate};
        this.anim.loop[3] = {x:cellW * 0, y:cellH * 2 , r:1.0};
        this.anim.loop[4] = {x:cellW * 0, y:cellH * 2 , r:0};
      } else

      if(this.facing === "right") {
        this.anim.loop[0] = {x:cellW * 0, y:cellH * 10, r:rate};
        this.anim.loop[1] = {x:cellW * 1, y:cellH * 10, r:rate};
        this.anim.loop[2] = {x:cellW * 2, y:cellH * 10, r:rate};
        this.anim.loop[3] = {x:cellW * 0, y:cellH * 3, r:1.0};
        this.anim.loop[4] = {x:cellW * 0, y:cellH * 3, r:0};
      }
      break;

    case "dieing":
      this.anim.loop[0] = {x:cellW * 0, y:cellH * 4, r:0.2};
      this.anim.loop[1] = {x:cellW * 0, y:cellH * 11, r:0.08};
      this.anim.loop[2] = {x:cellW * 1, y:cellH * 11, r:0.08};
      this.anim.loop[3] = {x:cellW * 2, y:cellH * 11, r:0.08};
      this.anim.loop[4] = {x:cellW * 3, y:cellH * 11, r:0.08};
      this.anim.loop[5] = {x:cellW * 4, y:cellH * 11, r:0.08};
      this.anim.loop[6] = {x:cellW * 4, y:cellH * 10, r:0.8};
      this.anim.loop[7] = {x:cellW * 4, y:cellH * 10, r:0};
      break;

    case "drowning":
      var rate = 0.07;
      this.anim.loop[0] = {x:cellW * 0, y:cellH * 4, r:rate};
      this.anim.loop[1] = {x:cellW * 0, y:cellH * 12, r:rate};
      this.anim.loop[2] = {x:cellW * 1, y:cellH * 12, r:rate};
      this.anim.loop[3] = {x:cellW * 2, y:cellH * 12, r:rate};
      this.anim.loop[4] = {x:cellW * 3, y:cellH * 12, r:rate};
      this.anim.loop[5] = {x:cellW * 4, y:cellH * 12, r:rate};
      this.anim.loop[6] = {x:cellW * 4, y:cellH * 10, r:0.8};
      this.anim.loop[7] = {x:cellW * 4, y:cellH * 10, r:0};
      break;

    case "watching":
      if (this.facing === "down")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 4, r:0}; }
      if (this.facing === "up")    { this.anim.loop[0] = {x:cellW * 0, y:cellH * 1, r:0}; }
      if (this.facing === "left")  { this.anim.loop[0] = {x:cellW * 0, y:cellH * 5 ,r:0}; }
      if (this.facing === "right") { this.anim.loop[0] = {x:cellW * 0, y:cellH * 6, r:0}; }
      break;

    default:
      alert(state + " animation not found.");
      break;
  }
};

Knight.prototype.hit = function(actor) {

  if (actor.type === "player") {
    if (actor.state != "dieing" && actor.state != "drowning") {
      actor.kill(this);
      this.face(actor);
      this.state = "attacking";
    }
  } else

  if (actor.constructor === IceBall) {
    this.state = "idle";
    this.canSeePlayer = false;
    this.idleTimer.cur = this.idleTimer.max - 1;
    this.wayPoints = [];
  }

  if (actor.rigidBody.type != "trigger" && actor.rigidBody.type != "weightless") {
    if (actor.type === "crate") {
      if (this.state === "patrolling") {
        var tile = null;
        var overlap = physics.getOverlap(this, actor);
        if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
          tile = stage.getTile(this.sX, this.sY - 1)
          if (tile.isBlocked === false && tile.type != "water") {
            this.wayPoints = [tile];
            return;
          }
          tile = stage.getTile(this.sX, this.sY + 1)
          if (tile.isBlocked === false && tile.type != "water") {
            this.wayPoints = [tile];
            return;
          }
        } else {
          tile = stage.getTile(this.sX - 1, this.sY)
          if (tile.isBlocked === false && tile.type != "water") {
            this.wayPoints = [tile];
            return;
          }
          tile = stage.getTile(this.sX + 1, this.sY)
          if (tile.isBlocked === false && tile.type != "water") {
            this.wayPoints = [tile];
            return;
           }
        }
      } else
      if (this.state === "chasing") {
        this.wayPoints = [];
        this.findPathToPlayer();
      }
    } else
    if (this.state === "patrolling" && actor.constructor === Knight && (time.now - this.lastHandChange)/1000 > 0.2) {
      this.lastHandChange = time.now;
      if (this.hand === "left") { this.hand = "right"; } else { this.hand = "left"; }
      if (this.facing === "up") { this.facing = "down"; } else
      if (this.facing === "down") { this.facing = "up"; } else
      if (this.facing === "left") { this.facing = "right"; } else
      if (this.facing === "right") { this.facing = "left"; }
      physics.applyForce(200, actor.x - this.x, actor.y - this.y, actor.rigidBody);
      this.wayPoints = [];
    }
  }
};

Knight.prototype.kill = function(killer) {
  this.isDead = true;
  physics.unRegisterActor(this);
  if (killer.constructor === Water) {
    this.state = "drowning";
  } else {
    this.rigidBody.velocity.x = 0;
    this.rigidBody.velocity.y = 0;
    this.state = "dieing";
  }
};




//////////
// BUZZ //
//////////
Buzz.pixelColors = [];
Buzz.pixelColors[0] = "192,192,192";
Buzz.pixelColors[1] = "160,160,160";
stage.actorIndex.push(Buzz);

function Buzz(x, y, pixel) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "enemy";
  this.isDead = false;
  this.sprite = new sprite(this, 0.5, 1, Buzz.sheet);
  this.rigidBody = new rigidBody(this, 2, 5, {w:14, h:14}, "weightless", [Player, Buzz]);
  this.anim = new animatron();
  if (pixel === Buzz.pixelColors[0]) { this.state = "clockwise"; }
  if (pixel === Buzz.pixelColors[1]) { this.state = "counter-clockwise"; }
  this.moveForce = 1200;
  this.facing = "up";
}

Buzz.sheet = new Image();
Buzz.sheet.src = "resources/art/buzz_spritesheet.png";
Buzz.sheet.cellW = 23;
Buzz.sheet.cellH = 24;

Buzz.prototype.isTile = false;
Buzz.prototype.isActor = true;

Buzz.prototype.wakeUp = function() {
  if (this.state === "clockwise") { var yOffset = 0; } else { var yOffset = 1; }
  this.anim.loop[0] = {x:this.sprite.sheet.cellW * 0, y:this.sprite.sheet.cellH * yOffset, r:0.04};
  this.anim.loop[1] = {x:this.sprite.sheet.cellW * 1, y:this.sprite.sheet.cellH * yOffset, r:0.04};
  this.anim.loop[2] = {x:this.sprite.sheet.cellW * 2, y:this.sprite.sheet.cellH * yOffset, r:0.04};
  
  var cardinal = [];
  cardinal[0] = {dir:"up",    x:0,  y:-1, dis:0};
  cardinal[1] = {dir:"down",  x:0,  y:1,  dis:0};
  cardinal[2] = {dir:"left",  x:-1, y:0,  dis:0};
  cardinal[3] = {dir:"right", x:1,  y:0,  dis:0};
  for (var i = 0; i < cardinal.length; i++) {
    var coord = {x: this.sX, y: this.sY};
    while (true) {
      coord.x += cardinal[i].x;
      coord.y += cardinal[i].y;
      cardinal[i].dis++;

      var tile = stage.getTile(coord.x, coord.y);
      if (tile.type === "wall" || tile.isBlocked) { break; }
    }
  }
  var lowest = cardinal[0];
   for (var i = 0; i < cardinal.length; i++) {
    if (cardinal[i].dis < lowest.dis) { lowest = cardinal[i]; }
  }
  this.facing = lowest.dir;
};

Buzz.prototype.update = function() {
  var x = 0;
  var y = 0;
  if (this.facing === "right") { x = 1; } else
  if (this.facing === "left")  { x = -1; } else
  if (this.facing === "up")    { y = -1; } else
  if (this.facing === "down")  { y = 1; }

  physics.applyForce(this.moveForce * time.deltaTime, x, y, this.rigidBody);

  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

Buzz.prototype.hit = function(actor) {
  if (actor.constructor === Arrow) {
    actor.kill(this);
    return;
  }
  if (actor.rigidBody.type != "trigger" && actor.rigidBody.type != "weightless") {
    if (actor.type === "player") {
      actor.kill(this);
    } else {
      var overlap = physics.getOverlap(this, actor);
      if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
        if (this.x < actor.x) { this.facing = "up"; } else { this.facing = "down"; }
      } else {
        if (this.y < actor.y) { this.facing = "right"; } else { this.facing = "left"; }
      }
      if (this.state === "counter-clockwise") {
        if (this.facing === "up")    { this.facing = "down"; } else
        if (this.facing === "down")  { this.facing = "up"; } else
        if (this.facing === "left")  { this.facing = "right"; } else
        if (this.facing === "right") { this.facing = "left"; }
      }
    }
  }
};

Buzz.prototype.kill = function(killer) {
  if (killer === physics) {
    if (stage.getTile(this.sX, this.sY).isBlocked) {
      for (var i = 0; i < stage.actors.length; i++) {
        if (stage.actors[i].type === "crate") {
          if (stage.actors[i].sX === this.sX && stage.actors[i].sY === this.sY) {
            stage.actors[i].kill(this);
            return;
          }
        }
      }
    }
  }
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




/////////////
// ICEWAND //
/////////////
IceWand.pixelColors = [];
IceWand.pixelColors[0] = "0,255,255";
stage.actorIndex.push(IceWand);

function IceWand(x, y) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.type = "pickup";
  this.isDead = false;
  this.anim = new animatron();
  this.sprite = new sprite(this, 0, -3, IceWand.sheet);
  this.rigidBody = new rigidBody(this, 1, 1, {w:4, h:8}, "soft");
};

IceWand.sheet = new Image();
IceWand.sheet.src = "resources/art/icewand_spritesheet.png";
IceWand.sheet.cellW = 10;
IceWand.sheet.cellH = 24;

IceWand.prototype.isTile = false;
IceWand.prototype.isActor = true;

IceWand.prototype.wakeUp = function() {
  this.anim.rate = 0.15;

  this.anim.loop[0] = {x:IceWand.sheet.cellW * 0, y:IceWand.sheet.cellH * 0};
  this.anim.loop[1] = {x:IceWand.sheet.cellW * 1, y:IceWand.sheet.cellH * 0};
  this.anim.loop[2] = {x:IceWand.sheet.cellW * 2, y:IceWand.sheet.cellH * 0};
  this.anim.loop[3] = {x:IceWand.sheet.cellW * 3, y:IceWand.sheet.cellH * 0};
  this.anim.loop[4] = {x:IceWand.sheet.cellW * 4, y:IceWand.sheet.cellH * 0};
};

IceWand.prototype.update = function() {
  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

IceWand.prototype.hit = function(actor) {
  if (actor.type === "player") {
    actor.addRemoveAmmo(1);
    this.kill(this);
  }
};

IceWand.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




/////////////
// ICEBALL //
/////////////
function IceBall(x, y, firer) {
  this.x = x;
  this.y = y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.firer = firer;
  this.facing = firer.facing;
  this.type = "projectile";
  this.isDead = false;
  this.sprite = new sprite(this, 0, 0, IceBall.sheet);
  this.rigidBody = new rigidBody(this, 1, 0, {w:12, h:12}, "trigger");
  this.anim = new animatron();
  this.anim.rate = 0.1;
  this.speed = 120;
  this.wakeUp();
};

IceBall.sheet = new Image();
IceBall.sheet.src = "resources/art/iceball_spritesheet.png";
IceBall.sheet.cellW = 18;
IceBall.sheet.cellH = 22;

IceBall.prototype.isTile = false;
IceBall.prototype.isActor = true;

IceBall.prototype.wakeUp = function() {
  var faceHeight = 0;
  if (this.facing === "up") {
    faceHeight = 0;
    this.rigidBody.collider.w = 6;
    physics.applyForce(this.speed, 0, -1, this.rigidBody);
  } else

  if (this.facing === "down") {
    faceHeight = 1;
    this.rigidBody.collider.w = 6;
    physics.applyForce(this.speed, 0, 1, this.rigidBody);
  } else

  if (this.facing === "left") {
    faceHeight = 2;
    this.rigidBody.collider.h = 8;
    physics.applyForce(this.speed, -1, 0, this.rigidBody);
  } else

  if (this.facing === "right") {
    faceHeight = 3;
    this.rigidBody.collider.h = 8;
    physics.applyForce(this.speed, 1, 0, this.rigidBody);
  }

  this.anim.loop[0] = {x:IceBall.sheet.cellW * faceHeight, y:IceBall.sheet.cellH * 0};
  this.anim.loop[1] = {x:IceBall.sheet.cellW * faceHeight, y:IceBall.sheet.cellH * 1};
  this.anim.loop[2] = {x:IceBall.sheet.cellW * faceHeight, y:IceBall.sheet.cellH * 2};

  stage.registerActor(this);
  physics.registerActor(this);
};

IceBall.prototype.update = function() {
  this.anim.update();
  this.sprite.source.x = this.anim.loop[this.anim.current].x;
  this.sprite.source.y = this.anim.loop[this.anim.current].y;
};

IceBall.prototype.hit = function(actor) {
  if (actor != this.firer) {
    if (actor.type === "enemy") {
      if (actor.constructor != Archer) {
        new IceBlock(actor);
        this.kill(actor);
      }
    }
    if (actor.rigidBody.type != "trigger" && actor.type != "pickup" && actor.type != "projectile") {
      this.kill(actor);
    }
  }
};

IceBall.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




//////////////
// ICEBLOCK //
//////////////
function IceBlock(frozenActor) {
  this.x = frozenActor.x;
  this.y = frozenActor.y;
  this.z = ATEYE;
  Object.defineProperty(this, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
  Object.defineProperty(this, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
  this.frozenActor = frozenActor;
  this.type = "unit";
  this.isDead = false;
  this.sprite = new sprite(this, 0, 0, IceBlock.sheet);
  this.rigidBody = new rigidBody(this, frozenActor.rigidBody.mass, 2, {w:frozenActor.width, h:frozenActor.height}, "soft");
  this.colliderTrueSize = {w: 18, h:16};
  this.needPhysReg = true;
  this.meltTimer = 8;
  this.wakeUp();
};

IceBlock.sheet = new Image();
IceBlock.sheet.src = "resources/art/iceblock_spritesheet.png";
IceBlock.sheet.cellW = 22;
IceBlock.sheet.cellH = 26;

IceBlock.prototype.isTile = false;
IceBlock.prototype.isActor = true;

IceBlock.prototype.wakeUp = function() {
  stage.registerActor(this);
  stage.unRegisterActor(this.frozenActor);
  physics.unRegisterActor(this.frozenActor);

  this.rigidBody.velocity.x = this.frozenActor.rigidBody.velocity.x;
  this.rigidBody.velocity.y = this.frozenActor.rigidBody.velocity.y;

  if (this.frozenActor.constructor != Buzz) {

    if (this.frozenActor.constructor === Knight) {
      this.sprite.source.x = IceBlock.sheet.cellW * 0;
    } else   
    if (this.frozenActor.constructor === Archer) {
      this.sprite.source.x = IceBlock.sheet.cellW * 1;
    }

    this.sprite.offset.y = -4;

    if (this.frozenActor.facing === "down") {
      this.sprite.source.y = IceBlock.sheet.cellH * 0;
    } else
    if (this.frozenActor.facing === "up") {
      this.sprite.source.y = IceBlock.sheet.cellH * 1;
    } else
    if (this.frozenActor.facing === "left") {
      this.sprite.source.y = IceBlock.sheet.cellH * 2;
    } else
    if (this.frozenActor.facing === "right") {
      this.sprite.source.y = IceBlock.sheet.cellH * 3;
    }

  } else {
    this.sprite.source.x = IceBlock.sheet.cellW * 2;
    if (this.frozenActor.state === "clockwise") {
      this.sprite.source.y = IceBlock.sheet.cellH * 1;
    }
  }
  
};

IceBlock.prototype.update = function() {
  if (this.needPhysReg) {
    this.needPhysReg = false;
    physics.registerActor(this);
  }

  if (this.width != this.colliderTrueSize.w) {
    this.rigidBody.collider.w += 6 * time.deltaTime;
    if (this.width > this.colliderTrueSize.w) {
      this.rigidBody.collider.w = this.colliderTrueSize.w;
    }
  }

  if (this.height != this.colliderTrueSize.h) {
    this.rigidBody.collider.h += 6 * time.deltaTime;
    if (this.height > this.colliderTrueSize.h) {
      this.rigidBody.collider.h = this.colliderTrueSize.h;
    }
  }

  this.meltTimer -= time.deltaTime;
  if (this.meltTimer <= 4 && this.sprite.source.x < IceBlock.sheet.cellW * 3) {
    this.sprite.source.x += IceBlock.sheet.cellW * 3;
  } else
  if (this.meltTimer <= 3 && this.sprite.source.x < IceBlock.sheet.cellW * 6) {
    this.sprite.source.x += IceBlock.sheet.cellW * 3;
  } else
  if (this.meltTimer <= 2 && this.sprite.source.x < IceBlock.sheet.cellW * 9) {
    this.sprite.source.x += IceBlock.sheet.cellW * 3;
  } else
  if (this.meltTimer <= 1 && this.sprite.source.x < IceBlock.sheet.cellW * 12) {
    this.sprite.source.x += IceBlock.sheet.cellW * 3;
  } else
  if (this.meltTimer <= 0) {
    this.melt();
  }
};

IceBlock.prototype.hit = function(actor) {
};

IceBlock.prototype.melt = function() {
  stage.registerActor(this.frozenActor);
  physics.registerActor(this.frozenActor);

  this.frozenActor.x = this.x;
  this.frozenActor.y = this.y;
  this.frozenActor.rigidBody.velocity.x = this.rigidBody.velocity.x;
  this.frozenActor.rigidBody.velocity.y = this.rigidBody.velocity.y;

  this.kill(this);
};

IceBlock.prototype.kill = function(killer) {
  this.isDead = true;
  stage.unRegisterActor(this);
  physics.unRegisterActor(this);
};




////////////////
// Start Game //
////////////////
stage.loadCurrentLevel();



