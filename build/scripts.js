// Determines what level the game starts on. Change this if you want to start on a different level.
var STARTLEVEL = 1; 

// If true this will limit the canvas size the game can fit inside of. This is to keep stupid people from playing the game full screen.
var LIMITCANVASSIZE = true;

// This is the camera "zoom". Makes the game look much better, but is probably too dangerous to be used here.
var CAMERASCALE = 1;





// Dont touch these
var TSIZE = 24;    // Tile Size
var HTSIZE = 12;    // Half Tile Size

var hideWall = null;
window.onblur = function() {
  if (gameLoop.isPaused === false) {
    gameLoop.pause();
  }
  // BACKDROP
  hideWall = new HUDRect(0, 0, 100, 0, 0, "white");
  HUD.register(hideWall);
  hideWall.update = function() {
    this.x = 0;
    this.y = 0;
    this.w = canvas.width;
    this.h = canvas.height;
  }
}

window.onfocus = function() {
  HUD.unRegister(hideWall);
  hideWall = null;
}

window.onload = function() {
  canvas.width = 24 * 12;
  canvas.height = 24 * 9;
  window.resizeTo(canvas.width + 30, canvas.height + 78);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
}

window.onresize = function() {
  canvas.width = window.innerWidth - 16;
  canvas.height = window.innerHeight - 16;
  if (LIMITCANVASSIZE) {
    var widthLimit = 24 * 18;
    var heightLimit = 24 * 14;
    if (canvas.width > widthLimit) { canvas.width = widthLimit; }
    if (canvas.height > heightLimit) { canvas.height = heightLimit; }
  }
  canvas.tWidth = Math.ceil(canvas.width / TSIZE);
  canvas.tHeight = Math.ceil(canvas.height / TSIZE);
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
}




////////////
// CANVAS //
////////////
canvas = document.getElementById("game");
canvas.width = 24 * 12;
canvas.height = 24 * 9;
canvas.tWidth = Math.ceil(canvas.width / TSIZE);
canvas.tHeight = Math.ceil(canvas.height / TSIZE);
ctx = canvas.getContext("2d");
ctx.msImageSmoothingEnabled = false;
ctx.imageSmoothingEnabled = false;




//////////
// TIME //
//////////
time = new Object();
time.now = (new Date()).getTime();
time.deltaTime = 0;
time.lastUpdate = time.now;
time.update = function() {
  this.now = (new Date()).getTime();
  this.deltaTime = (this.now - this.lastUpdate)/1000;
  this.lastUpdate = this.now;
};




///////////
// INPUT //
///////////
input = new Object();
input.update = function() {
  input.anyKey = false;
  for (var iter in input) {
    if(input.hasOwnProperty(iter)) {
      if (input[iter].keys == null) { continue; }

      if (input[iter].buffer != null) {

        if (input[iter].buffer == "pressed" && input[iter].state != true) {
          input[iter].state = true;
          input[iter].pressed = true;
          input[iter].released = false;
          input.anyKey = true;
        } else {
          if (input[iter].buffer == "released" && input[iter].state != false) {
            input[iter].state = false;
            input[iter].pressed = false;
            input[iter].released = true;
            input[iter].buffer = null;
          }
        }

        input[iter].buffer = null;
      } else {
        input[iter].pressed = false;
        input[iter].released = false;
      }
    }
  }
};

input.registerNew = function(name, keys) {
  input[name] = new Object();
  input[name].keys = keys;
  input[name].state = false;
  input[name].pressed = false;
  input[name].released = false;
  input[name].buffer = null;
};

input.clearAll = function() {
  for (var iter in input) {
    if(input.hasOwnProperty(iter)) {
      if (input[iter].keys == null) { continue; }
      input[iter].state = false;
      input[iter].pressed = false;
      input[iter].released = false;
      input[iter].buffer = null;
    }
  }
};

window.onkeydown = function(event) {
  // Enumerate and loop through object properties.
  for (var iter in input) {
    if(input.hasOwnProperty(iter)) {
    if (input[iter].keys == null) { continue; }
      for (var i = 0; i < input[iter].keys.length; i++) {
        if (event.key == input[iter].keys[i]) {
          input[iter].buffer = "pressed";
        }
      }
    }
  }

  if (gameLoop.isPaused) {
    gameLoop.addPassKey(event.key);
  }
};

window.onkeyup = function(event) {
  // Enumerate and loop through object properties.
  for (var iter in input) {
    if(input.hasOwnProperty(iter)) {
    if (input[iter].keys == null) { continue; }
      for (var i = 0; i < input[iter].keys.length; i++) {
        if (event.key == input[iter].keys[i]) {
          input[iter].buffer = "released";
        }
      }
    }
  }
};




///////////
// STAGE //
///////////
stage = new Object();
stage.width = 0;
stage.height = 0;
stage.currentLevel = STARTLEVEL;
stage.currentLevelImg = document.createElement("img");
stage.tileIndex = [];
stage.actorIndex = [];
stage.tiles = [];
stage.actors = [];
stage.unRegisterList = [];
stage.outOfBoundsWalls = [];
stage.curtain = null;
stage.levelTime = 0;
stage.levelDeaths = 0;
stage.showSkipScreen = false;
stage.skipScreen = null;

stage.loadCurrentLevel = function() {
  clearInterval(gameLoop.Interval);
  gameLoop.Interval = null;

  //GAME OVER
  if (stage.currentLevel === 61) {
    stage.currentLevelImg.src = "resources/art/game_over.png";

    if (stage.currentLevelImg.complete) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(stage.currentLevelImg, 0, 0, 162, 82, (canvas.width/2) - (162/2), (canvas.height/2) - (82/2), 162, 82);
    }

    setTimeout(stage.loadCurrentLevel, 1000 / 20);
    return false;
  }

  // Stop current level and prepare to load next level.
  stage.currentLevelImg.src = "resources/levels/lvl_" + stage.currentLevel + ".png";
  stage.unloadLevel();
  ctx.fillStyle = "black";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (stage.currentLevelImg.complete) {  
    // Draw level image.
    ctx.drawImage(stage.currentLevelImg, 0, 0);
    stage.width = stage.currentLevelImg.width;
    stage.height = stage.currentLevelImg.height;

    // Read stage png and load walls floors and actors.
    for (var x = 0; x < stage.width; x++) {
      stage.tiles[x] = [];
      for (var y = 0; y < stage.height; y++) {
        var pixel = ctx.getImageData(x, y, 1, 1);
        var pixelRound = 16;
        var r = Math.round(pixel.data[0] / pixelRound) * pixelRound;
        if (r === 256) { r = 255; }
        var g = Math.round(pixel.data[1] / pixelRound) * pixelRound;
        if (g === 256) { g = 255; }
        var b = Math.round(pixel.data[2] / pixelRound) * pixelRound;
        if (b === 256) { b = 255; }
        pixel = r.toString() + "," + g.toString() + "," + b.toString();
        if (stage.loadTile(x, y, pixel) == false) { return false; }
      }
    }
    stage.currentLevelImg.src = "";

    // Wakeup all tiles.
    for (var x = 0; x < stage.width; x++) {
      for (var y = 0; y < stage.height; y++) {
        stage.tiles[x][y].wakeUp();
      }
    }

    // Wakeup all actors.
    for (var i = 0; i < stage.actors.length; i++) {
      stage.actors[i].wakeUp();
    }

    stage.openCurtain();
    stage.prepHeadsUpDisplay();
    stage.notifications();

    gameLoop.Interval = setInterval(gameLoop.update, 1000 / 60);
    return true;
  } else {
    setTimeout(stage.loadCurrentLevel, 1000 / 20);
    return false;
  }
};

stage.loadTile = function(x, y, pixel) {
  for (var i = 0; i < this.tileIndex.length; i++) {
    for (var j = 0; j < this.tileIndex[i].pixelColors.length; j++) {
      if (this.tileIndex[i].pixelColors[j] == pixel) {
        this.tiles[x][y] = new this.tileIndex[i]((x * TSIZE) + HTSIZE, (y * TSIZE) + HTSIZE, pixel);
        return true;
      }
    }
  }

  this.tiles[x][y] = new Floor((x * TSIZE) + HTSIZE, (y * TSIZE) + HTSIZE, pixel);

  for (var i = 0; i < this.actorIndex.length; i++) {
    for (var j = 0; j < this.actorIndex[i].pixelColors.length; j++) {
      if (this.actorIndex[i].pixelColors[j] == pixel) {
        var nuActor = this.registerActor(new this.actorIndex[i]((x * TSIZE) + HTSIZE, (y * TSIZE) + HTSIZE, pixel));
        if (nuActor.rigidBody != null) { physics.registerActor(nuActor); }
        return true;
      }
    }
  }

  alert("Pixel at " + x + "," + y + " of color " + pixel + " is not a valid color.");
  return false;
};

stage.prepHeadsUpDisplay = function() {
  //Instructions Text
  if (stage.currentLevel === 1) {
    var instructions = new HUDImg(0, 0, 3, 240, 111, 0, 0, 240, 111, "resources/art/instructions_spritesheet.png");
    instructions.update = function() {
      gameLoop.isPaused = true;
      this.x = parseInt((canvas.width/2) - (this.w/2));
      this.y = parseInt((canvas.height/2) - (this.h/2));

      if (input["pause"].pressed) {
        HUD.unRegister(this);
      }
    };
    instructions.draw = function() {
      ctx.fillStyle = "black";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(this.img, this.sX, this.sY, this.sW, this.sH, this.x, this.y, this.w, this.h);
    }
    HUD.register(instructions);
  }

  //Current Level Text.
  var style = {msg: "Level: " + stage.currentLevel.toString(),
               font: "Bold 12px Arial",
               fill: "white",
               shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}
  };
  var levelText = new HUDText(0, 0, 0, style);
  levelText.currentLevel = stage.currentLevel;
  levelText.update = function() {
    this.x = 5;
    this.y = canvas.height - 20;

    if (this.currentLevel != stage.currentLevel) {
      HUD.unRegister(this);
    }
  };
  //HUD.register(levelText);

  //Password Text.
  style.msg = "Password: " + gameLoop.passIndex[stage.currentLevel];
  var passwordText = new HUDText(0, 0, 0, style);
  passwordText.currentLevel = stage.currentLevel;
  passwordText.update = function() {
    this.x = 4;
    this.y = canvas.height - 5;

    if (this.currentLevel != stage.currentLevel) {
      HUD.unRegister(this);
    }
  };
  HUD.register(passwordText);
}

stage.registerActor = function(target) {
  for(var i = 0; i < this.actors.length; i++) {
    if (this.actors[i] == target) {
      return this.actors[i];
    }
    if (this.actors[i].z > target.z) {
      this.actors.splice(i, 0, target);
      return target;
    }
  }
  this.actors.push(target);
  return target;
};

stage.unRegisterActor = function(target) {
  this.unRegisterList.push(target);
};

stage.unloadLevel = function() {
  stage.tiles = [];
  stage.actors = [];
  stage.unRegisterList = [];
  stage.outOfBoundsWalls = [];

  physics.actors = [];
  HUD.elements = [];
};

stage.getTile = function(x, y) {
  if(x >= 0 && x < stage.width && y >= 0 && y < stage.height) {
    return stage.tiles[x][y];
  } else {
    for (var i = 0; i < stage.outOfBoundsWalls.length; i++) {
      if (stage.outOfBoundsWalls[i].sX === x && stage.outOfBoundsWalls[i].sY === y) {
        return stage.outOfBoundsWalls[i];
      }
    }

    var nuWall = new Wall(0,0);
    nuWall.sprite.source.x = 4 * nuWall.sprite.sheet.cellW;
    nuWall.sprite.source.y = 6 * nuWall.sprite.sheet.cellH;
    nuWall.x = (x * TSIZE) + HTSIZE;
    nuWall.y = (y * TSIZE) + HTSIZE;
    nuWall.sX = x;
    nuWall.sY = y;
    stage.outOfBoundsWalls.push(nuWall);

    return nuWall;
  }
};

stage.getTileAtWorld = function(x, y) {
  return this.getTile(parseInt(x / TSIZE), parseInt(y / TSIZE));
};

stage.getTilesInside = function(top, bottom, left, right) {
  top = Math.floor(top / TSIZE);
  bottom = Math.floor(bottom / TSIZE);
  left = Math.floor(left / TSIZE);
  right = Math.floor(right / TSIZE);

/*
  if ((top < 0) || (bottom >= stage.height) || (left < 0) || (right >= stage.width)) {
    console.error("Out of bounds in getTilesInside.");
    debugger;
    return null;
  }
*/

  var nuList = [];
  for (var x = 0; x <= right - left; x++) {
    nuList[x] = [];
    for (var y = 0; y <= bottom - top; y++) {
      nuList[x][y] = stage.getTile(left + x, top + y);
    }
  }
  return nuList;
}

stage.update = function() {
  stage.levelTime += time.deltaTime;

  for (var y = 0; y < stage.height; y++) {
    for (var x = 0; x < stage.width; x++) {
      if (stage.tiles[x][y].update != null) { stage.tiles[x][y].update(); }
    }
  }

  if (this.unRegisterList.length != 0) {
    for(var i = 0; i < this.unRegisterList.length; i++) {
      for(var j = 0; j < this.actors.length; j++) {
        if (this.actors[j] == this.unRegisterList[i]) {
          this.actors.splice(j, 1);
          break;
        }
      }
    }
    this.unRegisterList = [];
  }

  for (var i = 0; i < this.actors.length; i++) {
    if (this.actors[i].update != null) { this.actors[i].update(); }
  }

  for (var i = 0; i < this.actors.length; i++) {
    if (this.actors[i].lateUpdate != null) { this.actors[i].lateUpdate(); }
  }
};

stage.sortActors = function() {
  /* Because this is not a critical game function and swaps should be infrequent
  I have used a lazy bubble sort that will eventually organize the actor list over time
  and may not be 100% perfect with every gameloop. */

  //Bubblesort actors by z axis first and y axis second.
  for (var i = 0; i < stage.actors.length - 1; i++) {
    if ((stage.actors[i].z > stage.actors[i + 1].z) ||
    (stage.actors[i].z == stage.actors[i + 1].z && stage.actors[i].y > stage.actors[i + 1].y)) {
        var temp = stage.actors[i];
        stage.actors[i] = stage.actors[i + 1];
        stage.actors[i + 1] = temp;
    }
  }
};

stage.notifications = function() {
  if (stage.currentLevel >= 2 && stage.currentLevel <= 4) {
    var style = {font: "Bold 11px Arial", fill: "white", shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}};
    style.msg = "";

    var notification = new HUDText(2, 12, 10, style);
    notification.timer = 10;
    HUD.register(notification);
    notification.update = function() {
      if (gameLoop.isPaused != true) { this.timer -= time.deltaTime; }
      if (this.timer < 0) {
        this.msg = "Tip: You can press R at anytime to restart a level."
      }
      if (this.timer < -10.0) {
        HUD.unRegister(this);
      }
    }
  }

  if (stage.currentLevel >= 6 && stage.currentLevel <= 7) {
    var style = {font: "Bold 11px Arial", fill: "white", shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}};
    style.msg = "";

    var notification = new HUDText(2, 12, 10, style);
    notification.timer = 10;
    HUD.register(notification);
    notification.update = function() {
      if (gameLoop.isPaused != true) { this.timer -= time.deltaTime; }
      if (this.timer < 0) {
        this.msg = "Tip: Use passwords to skip to a specific level.";
      }
      if (this.timer < -15.0) {
        HUD.unRegister(this);
      }
    }

    var notification = new HUDText(2, 28, 10, style);
    notification.timer = 10;
    HUD.register(notification);
    notification.update = function() {
      if (gameLoop.isPaused != true) { this.timer -= time.deltaTime; }
      if (this.timer < 0) {
        this.msg = "Press Enter to pause and type the password in.";
      }
      if (this.timer < -15.0) {
        HUD.unRegister(this);
      }
    }
  }

  if (stage.currentLevel >= 9 && stage.currentLevel <= 10) {
    var style = {font: "Bold 11px Arial", fill: "white", shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}};
    style.msg = "";

    var notification = new HUDText(2, 12, 10, style);
    notification.timer = 10;
    HUD.register(notification);
    notification.update = function() {
      if (gameLoop.isPaused != true) { this.timer -= time.deltaTime; }
      if (this.timer < 0) {
        this.msg = "Tip: Don't forget to write down the password!";
      }
      if (this.timer < -10.0) {
        HUD.unRegister(this);
      }
    }
  }

  if (stage.currentLevel === 14) {
    var style = {font: "Bold 11px Arial", fill: "white", shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}};
    style.msg = "";

    var notification = new HUDText(2, 12, 10, style);
    notification.timer = 5;
    HUD.register(notification);
    notification.update = function() {
      if (gameLoop.isPaused != true) { this.timer -= time.deltaTime; }
      if (this.timer < 0) {
        this.msg = "Tip: Press the SpaceBar to fire!";
      }
      if (this.timer < -10.0) {
        HUD.unRegister(this);
      }
    }
  }
}

stage.skipLevelCheck = function() {
  if (stage.levelTime >= 240.0 && stage.levelDeaths >= 5) {
    stage.showSkipScreen = true;
  }
}

stage.openSkipScreen = function() {
  stage.showSkipScreen = false;

  // SKIPSCREEN
  stage.skipScreen = new Object();
  HUD.register(stage.skipScreen);
  stage.skipScreen.members = [];
  stage.skipScreen.answer = false;
  stage.skipScreen.update = function() {
    gameLoop.isPaused = true;

    if (input["pause"].pressed) {
      if (this.answer === true) {
        stage.levelTime = 0;
        stage.levelDeaths = 0;
        stage.currentLevel += 1;
      } else {
        stage.levelDeaths = 2;
      }
      gameLoop.nextLevel = true;
    }

    if (input.anyKey === true && input["pause"].pressed != true) {
      if (this.answer === true) {
        this.answer = false;
      } else {
        this.answer = true;
      }
    }

    for (var i = 0; i < this.members.length; i++) {
      if (this.members[i].update != null) { this.members[i].update(); }
    }
  }

  stage.skipScreen.draw = function() {
    for (var i = 0; i < this.members.length; i++) {
      if (this.members[i].draw != null) { this.members[i].draw(); }
    }
  }

  // BACKDROP
  var backDrop = new HUDRect(0, 0, 2, 0, 0, "black");
  stage.skipScreen.members.push(backDrop);
  backDrop.update = function() {
    this.x = 0;
    this.y = 0;
    this.w = canvas.width;
    this.h = canvas.height;
  }

  // TEXT
  var style = {font: "Bold 12px Arial", fill: "white", shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}};

  style.msg = "You seem to be struggling.";
  var skipText = new HUDText(0, 0, 10, style);
  stage.skipScreen.members.push(skipText);
  skipText.update = function() {
    this.x = (canvas.width/2) - 75;
    this.y = (canvas.height/2) - 32;
  }

  style.msg = "Would you like to skip this level?";
  var skipText = new HUDText(0, 0, 10, style);
  stage.skipScreen.members.push(skipText);
  skipText.update = function() {
    this.x = (canvas.width/2) - 88;
    this.y = (canvas.height/2) - 16;
  }

  style.msg = "Yes";
  style.fill = "rgb(100,100,100)";
  var skipText = new HUDText(0, 0, 10, style);
  stage.skipScreen.members.push(skipText);
  skipText.update = function() {
    this.y = (canvas.height/2) + 16;
    if (stage.skipScreen.answer === true) {
      this.x = (canvas.width/2) -42;
      this.fill = "rgb(0,255,0)";
      this.font = "Bold 14px Arial";
    } else {
      this.x = (canvas.width/2) -40;
      this.fill = "rgb(100,100,100)";
      this.font = "Bold 12px Arial";
    }
  }

  style.msg = "No";
  var skipText = new HUDText(0, 0, 10, style);
  stage.skipScreen.members.push(skipText);
  skipText.update = function() {
    this.y = (canvas.height/2) + 16;
    if (stage.skipScreen.answer === false) {
      this.x = (canvas.width/2) + 19;
      this.fill = "rgb(255,0,0)";
      this.font = "Bold 14px Arial";
    } else {
      this.x = (canvas.width/2) + 20;
      this.fill = "rgb(100,100,100)";
      this.font = "Bold 12px Arial";
    }
  }
}

stage.openCurtain = function() {
  if (this.curtain === null) {
    this.curtain = new HUDRect(0, 0, 2, 0, 0, "black");
    this.curtain.state = "opening";
    this.curtain.timer = 0;
    this.curtain.length = 0.5;
    this.curtain.update = function() {
      gameLoop.isPaused = true;
      this.timer += time.deltaTime;
      if (this.timer > this.length) { this.timer = this.length; }

      this.x = 0;
      this.y = 0;
      this.w = canvas.width;
      this.h = canvas.height * (1 - (this.timer / this.length));

      if (this.timer === this.length) {
        HUD.unRegister(this);
        gameLoop.isPaused = false;
        stage.curtain = null;
      }
    }
    HUD.register(this.curtain);
  }
};

stage.closeCurtain = function() {
  if (this.curtain === null) {
    this.curtain = new HUDRect(0, 0, 2, 0, 0, "black");
    this.curtain.state = "closing";
    this.curtain.timer = 0;
    this.curtain.length = 0.5;
    this.curtain.update = function() {
      gameLoop.isPaused = true;
      this.timer += time.deltaTime;
      if (this.timer > this.length) { this.timer = this.length; }

      this.w = canvas.width * (this.timer / this.length);
      this.h = canvas.height * (this.timer / this.length);
      this.x = (canvas.width/2) - (this.w/2);
      this.y = (canvas.height/2) - (this.h/2);

      if (this.timer === this.length) {
        HUD.unRegister(stage.curtain);
        stage.curtain = null;
        if (stage.showSkipScreen === false) {
          gameLoop.nextLevel = true;
        } else {
          stage.openSkipScreen();
        }
      }
    }
    HUD.register(this.curtain);
  }
};


/////////////
// PHYSICS //
/////////////
physics = new Object();
physics.actors = [];
physics.unRegisterList = [];
physics.registerList = [];
physics.update = function() {

  //Unregistration
  if (this.unRegisterList.length != 0) {
    for(var i = 0; i < this.unRegisterList.length; i++) {
      for(var j = 0; j < this.actors.length; j++) {
        if (this.actors[j] == this.unRegisterList[i]) {
          this.actors.splice(j, 1);
          break;
        }
      }
    }
    this.unRegisterList = [];
  }

  //Registration
  if (this.registerList.length != 0) {
    for(var i = 0; i < this.registerList.length; i++) {
      for(var j = 0; j < this.actors.length; j++) {
        if (this.actors[j] == this.registerList[i]) {  break; }
      }
      this.actors.push(this.registerList[i]);
    }
    this.registerList = [];
  }

  //Position update and friction application
  for (var i = 0; i < this.actors.length; i++) {
    var rB = this.actors[i].rigidBody;
    if (rB.velocity.x == 0 && rB.velocity.y == 0) { continue; }

    //Apply velocity and friction.
    if (rB.type != "static") {
      // Apply Friction
      if (rB.friction > 0) {
        var nuVelX = rB.friction * rB.velocity.x * time.deltaTime;
        var nuVelY = rB.friction * rB.velocity.y * time.deltaTime;
        if (Math.abs(nuVelX) < Math.abs(rB.velocity.x)) { rB.velocity.x -= nuVelX; } else { rB.velocity.x = 0; }
        if (Math.abs(nuVelY) < Math.abs(rB.velocity.y)) { rB.velocity.y -= nuVelY; } else { rB.velocity.y = 0; }

        // bring body to rest if too low (not sure if neccessary)
        if (Math.abs(rB.velocity.x) < 1) { rB.velocity.x = 0; }
        if (Math.abs(rB.velocity.y) < 1) { rB.velocity.y = 0; }
      }

      // Update Position
      this.actors[i].x += rB.velocity.x * time.deltaTime;
      this.actors[i].y += rB.velocity.y * time.deltaTime;
    }
  }

  var hits = [];
  var nuHit = true;
  while (nuHit) {
    nuHit = false;
    for (var i = 0; i < this.actors.length; i++) {

      //Check for collision with other actors.
      for(var j = i+1; j < this.actors.length; j++) {
        var overlap = this.getOverlap(this.actors[i], this.actors[j]);
        if (overlap.x != 0 && overlap.y != 0) {
          if (hits[i] == null) { hits[i] = new HitData(this.actors[i]); }
          if (hits[j] == null) { hits[j] = new HitData(this.actors[j]); }

          var alreadyHit = false;
          for (var k = 0; k < hits[i].list.length; k++) {
            if (hits[i].list[k] == this.actors[j]) {
              alreadyHit = true;
            }
          }

          if (alreadyHit == false) {
            nuHit = true;
            hits[i].add(this.actors[j]);
            hits[j].add(this.actors[i]);
            this.findLimits(hits[i], hits[j], overlap);
          }

        }
      }

      //Check for collision with stage tiles.
      var tileList = stage.getTilesInside(this.actors[i].top, this.actors[i].bottom, this.actors[i].left, this.actors[i].right);
      for (var x = 0; x < tileList.length; x++) {
        for (var y = 0; y < tileList[x].length; y++) {
          if (tileList[x][y].rigidBody != null) {
            var overlap = this.getOverlap(this.actors[i], tileList[x][y]);
            if (overlap.x != 0 && overlap.y != 0) {
              if (hits[i] == null) { hits[i] = new HitData(this.actors[i]); }

              var alreadyHit = false;
              for (var j = 0; j < hits[i].list.length; j++) {
                if (hits[i].list[j] == tileList[x][y]) {
                  alreadyHit = true;
                }
              }

              if (alreadyHit == false) {
                nuHit = true;
                hits[i].add(tileList[x][y]);
                var dummyHitData = new HitData(tileList[x][y]);
                dummyHitData.add(this.actors[i]);
                this.findLimits(hits[i], dummyHitData, overlap);
              }
            } // end if overlap
          } // end if rigidbody
        } // end for y
      } // end for x
    }// end for i

    // Find new position
    if (nuHit == true) {
      for (var i = 0; i < hits.length; i++) {
        if (hits[i] != null) {
          if (hits[i].lLim != null && hits[i].rLim != null) {
            this.actors[i].x = (hits[i].lLim + hits[i].rLim) / 2;
            if (Math.abs(hits[i].rLim - hits[i].lLim) < this.actors[i].width / 2) {
              if (this.actors[i].kill != null) { this.actors[i].kill(physics); }
            }
          } else {
            if (hits[i].lLim != null) {
              this.actors[i].x = hits[i].lLim + (this.actors[i].width / 2);
            }
            if (hits[i].rLim != null) {
              this.actors[i].x = hits[i].rLim - (this.actors[i].width / 2);
            }
          }
          if (hits[i].tLim != null && hits[i].bLim != null) {
            this.actors[i].y = (hits[i].tLim + hits[i].bLim) / 2;
            if (Math.abs(hits[i].bLim - hits[i].tLim) < this.actors[i].height / 2) {
              if (this.actors[i].kill != null) { this.actors[i].kill(physics); }
            }
          } else {
            if (hits[i].tLim != null) {
              this.actors[i].y = hits[i].tLim + (this.actors[i].height / 2);
            }
            if (hits[i].bLim != null) {
              this.actors[i].y = hits[i].bLim - (this.actors[i].height / 2);
            }
          }
        }
      }
    }
  } //End while nuhit

  //Apply all movement vectors
  for (var i = 0; i < hits.length; i++) {
    if (hits[i] != null) {
      var vector = {x:hits[i].target.x - hits[i].startPos.x, y:hits[i].target.y - hits[i].startPos.y }
      var force = hits[i].target.rigidBody.mass * Math.sqrt(Math.pow(vector.x / time.deltaTime, 2) + Math.pow(vector.y / time.deltaTime, 2));
      physics.applyForce(force, vector.x, vector.y, hits[i].target.rigidBody);
    }
  }

  //Call all hit functions.
  for (var i = 0; i < hits.length; i++) {
    if (hits[i] != null) {
      for (var j = 0; j < hits[i].list.length; j++) {
        if (hits[i].target.hit != null) { hits[i].target.hit(hits[i].list[j]); }
        if (hits[i].list[j].isTile && hits[i].list[j].hit != null) { hits[i].list[j].hit(hits[i].target); }
      }
    }
  }
};

physics.registerActor = function(target) {
  this.registerList.push(target);
};

physics.unRegisterActor = function(target) {
  this.unRegisterList.push(target);
};

function HitData(target) {
  this.target = target;
  this.startPos = {x:target.x, y:target.y};
  this.list = [];
  this.tLim = null; // top limit
  this.bLim = null; // bottom limit
  this.lLim = null; // left limit
  this.rLim = null; // right limit
}
HitData.prototype.add = function(actor) { this.list.push(actor); }

physics.findLimits = function(fstHit, secHit, overlap) {
  var first = fstHit.target;
  var second = secHit.target;
  var fRB = first.rigidBody;
  var sRB = second.rigidBody;

  if (fRB.type == "trigger" || sRB.type == "trigger") { return; }
  if (fRB.type == "weightless" && sRB.type == "weightless") { return; }
  if (fRB.type == "static" && sRB.type == "static") { return; }

  for (var j = 0; j < fRB.ignores.length; j++) {
    if (fRB.ignores[j] == second.constructor) { return; }
  }

  for (var j = 0; j < sRB.ignores.length; j++) {
    if (sRB.ignores[j] == first.constructor) { return; }
  }

  var overlapProtection = 0.001;

  // Hard collision on the first rigidbody.
  if (fRB.type != "static" && (fRB.type == "weightless" || sRB.type == "static")) {
    if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
      if (first.x > second.x) {
        if (fstHit.lLim == null || fstHit.lLim < second.right + overlapProtection) {
          fstHit.lLim = second.right + overlapProtection;
        }
      } else {
        if (fstHit.rLim == null || fstHit.rLim > second.left - overlapProtection) {
          fstHit.rLim = second.left - overlapProtection;
        }
      }
    } else {
      if (first.y > second.y) {
        if (fstHit.tLim == null || fstHit.tLim < second.bottom + overlapProtection) {
          fstHit.tLim = second.bottom + overlapProtection;
        }
      } else {
        if (fstHit.bLim == null || fstHit.bLim > second.top - overlapProtection) {
          fstHit.bLim = second.top - overlapProtection;
        }
      }
    }
    return;
  }

  // Hard collision on the second rigidbody.
  if (sRB.type != "static" && (sRB.type == "weightless" || fRB.type == "static")) {
    if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
      if (second.x > first.x) {
        if (secHit.lLim == null || secHit.lLim < first.right + overlapProtection) {
          secHit.lLim = first.right + overlapProtection;
        }
      } else {
        if (secHit.rLim == null || secHit.rLim > first.left - overlapProtection) {
          secHit.rLim = first.left - overlapProtection;
        }
      }
    } else {
      if (second.y > first.y) {
        if (secHit.tLim == null || secHit.tLim < first.bottom + overlapProtection) {
          secHit.tLim = first.bottom + overlapProtection;
        }
      } else {
        if (secHit.bLim == null || secHit.bLim > first.top - overlapProtection) {
          secHit.bLim = first.top - overlapProtection;
        }
      }
    }
    return;
  }

  // Soft collision on both rigidbodies.
  if (fRB.type != "static" && sRB.type != "static") {
    if (Math.abs(overlap.x) < Math.abs(overlap.y)) {
      var fDiff = Math.abs(overlap.x) * (sRB.mass / (fRB.mass + sRB.mass));
      var sDiff = Math.abs(overlap.x) * (fRB.mass / (fRB.mass + sRB.mass));
      if (first.x > second.x) {
        if (fstHit.lLim == null || fstHit.lLim < second.right - sDiff) {
          fstHit.lLim = second.right - sDiff;
        }
        if (secHit.rLim == null || secHit.rLim > first.left + fDiff) {
          secHit.rLim = first.left + fDiff;
        }
      } else {
        if (fstHit.rLim == null || fstHit.rLim > second.left - sDiff) {
          fstHit.rLim = second.left + sDiff;
        }
        if (secHit.lLim == null || secHit.lLim < first.right + fDiff) {
          secHit.lLim = first.right - fDiff;
        }
      }
    } else {
      var fDiff = Math.abs(overlap.y) * (fRB.mass / (fRB.mass + sRB.mass));
      var sDiff = Math.abs(overlap.y) * (sRB.mass / (fRB.mass + sRB.mass));
      if (first.y > second.y) {
        if (fstHit.tLim == null || fstHit.tLim < second.bottom - sDiff) {
          fstHit.tLim = second.bottom - sDiff;
        }
        if (secHit.bLim == null || secHit.bLim > first.top + fDiff) {
          secHit.bLim = first.top + fDiff;
        }
      } else {
        if (fstHit.bLim == null || fstHit.bLim > second.top - sDiff) {
          fstHit.bLim = second.top + sDiff;
        }
        if (secHit.tLim == null || secHit.tLim < first.bottom + fDiff) {
          secHit.tLim = first.bottom - fDiff;
        }
      }
    }
    return;
  }
};

physics.getOverlap = function(first, second) {
  // Overlap variable we will return
  var overlap = {x:0, y:0};

  // Calculate x overlap.
  if (first.x > second.x) {
    if (first.left < second.right) { overlap.x = first.left - second.right; }
  } else {
    if (first.right > second.left) { overlap.x = first.right - second.left; }
  }

  // Calculate y overlap.
  if (first.y > second.y) {
    if (first.top < second.bottom) { overlap.y = first.top - second.bottom; }
  } else {
    if (first.bottom > second.top) { overlap.y = first.bottom - second.top; }
  }

  return overlap
};

physics.rayTrace = function(sX, sY, eX, eY) {
  var ray = [];

  var dX = Math.abs(eX - sX);
  var dY = Math.abs(eY - sY);
  var x = sX;
  var y = sY;
  var n = 1 + dX + dY;
  if (eX > sX) { var xInc = 1; } else { var xInc = -1; }
  if (eY > sY) { var yInc = 1; } else { var yInc = -1; }
  var error = dX - dY;
  dX *= 2;
  dY *= 2;

  for (var n = n; n > 0; --n) {
    ray.push(stage.getTile(x, y));

    if (error > 0) {
      x += xInc;
      error -= dY;
    } else {
      y += yInc;
      error += dX;
    }
  }

  return ray;
}

physics.applyForce = function(force, xDir, yDir, rB) {
  // Get x and y magnitudes
  var xMag = Math.sqrt(Math.abs(xDir) / (Math.abs(xDir) + Math.abs(yDir))) || 0;
  var yMag = Math.sqrt(Math.abs(yDir) / (Math.abs(xDir) + Math.abs(yDir))) || 0;
  if (xDir < 0) { xMag *= -1; }
  if (yDir < 0) { yMag *= -1; }

  //Acceleration = Force / Mass
  var acceleration = force / rB.mass;
  rB.velocity.x += acceleration * xMag;
  rB.velocity.y += acceleration * yMag;
};




////////////
// CAMERA //
////////////
camera = new Object();
camera.x = 0;
camera.y = 0;
Object.defineProperty(camera, "sX", { get: function() { return parseInt(this.x / TSIZE); }});
Object.defineProperty(camera, "sY", { get: function() { return parseInt(this.y / TSIZE); }});
camera.scale = CAMERASCALE;
camera.focus = null;
camera.panMode = false;
camera.outOfBoundsWall = null;
input.registerNew ("dbug", [/*"b", "B"*/]);

camera.update = function() {
  // Update focus
  if (this.focus != null) {
    if (this.panMode == false) {
      this.x = this.focus.x;
      this.y = this.focus.y;
    } else {
      console.log("Pan Mode not written yet");
    }
  }

  //camera view variables
  var halfCanvasWidth = Math.ceil(Math.ceil(canvas.tWidth / this.scale) / 2);
  var halfCanvasHeight = Math.ceil(Math.ceil(canvas.tHeight / this.scale) / 2);

  var camLeft = this.sX - halfCanvasWidth;
  var camRight = this.sX + halfCanvasWidth + 1;
  var camTop = this.sY - halfCanvasHeight;
  var camBottom = this.sY + halfCanvasHeight + 1;

  //Draw walls and floors
  for(var y = camTop; y < camBottom; y++) {
    for(var x = camLeft; x < camRight; x++) {
      if(x >= 0 && x < stage.width && y >= 0 && y < stage.height) {
        this.draw(stage.getTile(x, y));
      } else {
        if (camera.outOfBoundsWall === null) {
          camera.outOfBoundsWall = new Wall(0,0);
          camera.outOfBoundsWall.sprite.source.x = 4 * camera.outOfBoundsWall.sprite.sheet.cellW;
          camera.outOfBoundsWall.sprite.source.y = 6 * camera.outOfBoundsWall.sprite.sheet.cellH;
        }
        camera.outOfBoundsWall.x = (x * TSIZE) + HTSIZE;
        camera.outOfBoundsWall.y = (y * TSIZE) + HTSIZE;
        this.draw(camera.outOfBoundsWall);
      }
    }
  }

  if (gameLoop.isInDBug) {
    for(var x = camLeft; x < camRight; x++) {
      for(var y = camTop; y < camBottom; y++) {
        this.drawDBUG(stage.getTile(x, y));
      }
    }
  }

  halfCanvasWidth = Math.ceil(Math.ceil(canvas.width / this.scale) / 2);
  halfCanvasHeight = Math.ceil(Math.ceil(canvas.height / this.scale) / 2);
  camLeft = this.x - halfCanvasWidth;
  camRight = this.x + halfCanvasWidth + 1;
  camTop = this.y - halfCanvasHeight;
  camBottom = this.y + halfCanvasHeight + 1;

  stage.sortActors();

  //Draw actors
  for (var i = 0; i < stage.actors.length; i++) {
  var a = stage.actors[i];
  var s = stage.actors[i].sprite;
    if (a.x + s.offset.x + s.sheet.cellW > camLeft &&
        a.x + s.offset.x - s.sheet.cellW < camRight &&
        a.y + s.offset.y + s.sheet.cellH > camTop &&
        a.y + s.offset.y - s.sheet.cellH < camBottom) {
      this.draw(stage.actors[i]);
    }
  }

  if (gameLoop.isInDBug) {
    for (var i = 0; i < stage.actors.length; i++) {
    var a = stage.actors[i];
    var s = stage.actors[i].sprite;
      if (a.x + s.offset.x + s.sheet.cellW > camLeft &&
          a.x + s.offset.x - s.sheet.cellW < camRight &&
          a.y + s.offset.y + s.sheet.cellH > camTop &&
          a.y + s.offset.y - s.sheet.cellH < camBottom) {
        this.drawDBUG(stage.actors[i]);
      }
    }
  }

  //Draw HUD
  for (var i = 0; i < HUD.elements.length; i++) {
    HUD.elements[i].draw();
  }
};

camera.draw = function(target) {
  // Find destination X and Y
  var sW = target.sprite.sheet.cellW;
  var sH = target.sprite.sheet.cellH;
  var dX = (((target.x + target.sprite.offset.x) - (sW / 2)) * this.scale) - ((this.x * this.scale) - (canvas.width / 2));
  var dY = (((target.y + target.sprite.offset.y) - (sH / 2)) * this.scale) - ((this.y * this.scale) - (canvas.height / 2));

  // If on screen
  if (dX + (sW * this.scale) > 0 && dY + (sH * this.scale) > 0 && dX < canvas.width && dY < canvas.height) {
    var img = target.sprite.sheet;

    // if image is loaded
    if (img.complete) {
      var sX = target.sprite.source.x;
      var sY = target.sprite.source.y;
      var dW = sW * this.scale;
      var dH = sH * this.scale;

      // Round all draw variables down to even integers to prevent half pixel draw calls.
      dX = Math.round(dX, 1); dY = Math.round(dY, 1); dW = Math.round(dW, 1); dH = Math.round(dH, 1);

      // Draw image to screen.
      ctx.drawImage(img, sX, sY, sW, sH, dX, dY, dW, dH);
    }
  }
};

camera.drawDBUG = function(target) {
  // Find destination X and Y
  var sW = target.sprite.sheet.cellW;
  var sH = target.sprite.sheet.cellH;
  var dX = (((target.x + target.sprite.offset.x) - (sW / 2)) * this.scale) - ((this.x * this.scale) - (canvas.width / 2));
  var dY = (((target.y + target.sprite.offset.y) - (sH / 2)) * this.scale) - ((this.y * this.scale) - (canvas.height / 2));

  // If on screen
  if (dX + (sW * this.scale) > 0 && dY + (sH * this.scale) > 0 && dX < canvas.width && dY < canvas.height) {
    var img = target.sprite.sheet;

    // if image is loaded
    if (img.complete) {
      var sX = target.sprite.source.x;
      var sY = target.sprite.source.y;
      var dW = sW * this.scale;
      var dH = sH * this.scale;

      // Round all draw variables down to even integers to prevent half pixel draw calls.
      dX = Math.round(dX, 1); dY = Math.round(dY, 1); dW = Math.round(dW, 1); dH = Math.round(dH, 1);

      //Draw sprite outline.
      //ctx.strokeStyle = "black";
      //ctx.strokeRect(dX, dY, dW, dH);

      //Draw collision box outline.
      if (target.rigidBody != null) {
        dX = Math.round((target.x * this.scale) - ((this.x * this.scale) - (canvas.width / 2)) - ((target.width * this.scale) / 2));
        dY = Math.round((target.y * this.scale) - ((this.y * this.scale) - (canvas.height / 2)) - ((target.height * this.scale) / 2));
        ctx.strokeStyle = "red";
        ctx.strokeRect(dX, dY, target.width * this.scale, target.height * this.scale);
      }
    }
  }
};




//////////////////////
// HEADS UP DISPLAY //
//////////////////////
HUD = new Object();
HUD.elements = [];
HUD.registerList = [];
HUD.unRegisterList = [];

HUD.update = function() {

  //Unregistration
  if (this.unRegisterList.length != 0) {
    for(var i = 0; i < this.unRegisterList.length; i++) {
      for(var j = 0; j < this.elements.length; j++) {
        if (this.elements[j] == this.unRegisterList[i]) {
          this.elements.splice(j, 1);
          break;
        }
      }
    }
    this.unRegisterList = [];
  }

  //Registration
  if (this.registerList.length != 0) {
    for(var i = 0; i < this.registerList.length; i++) {
      for(var j = 0; j < this.elements.length; j++) {
        if (this.elements[j].z > this.registerList[i].z) {
          this.elements.splice(j, 0, this.registerList[i]);
          break;
        }
      }
      if(j >= this.elements.length) { this.elements.push(this.registerList[i]); }
    }
    this.registerList = [];
  }

  for (var i = 0; i < this.elements.length; i++) {
    if (this.elements[i].update != null) {
      this.elements[i].update();
    }
  }
}

HUD.register = function(HUDelement) {
  for (var i = 0; i < this.registerList.length; i++) {
    if (this.registerList[i] == HUDelement) { return false; }
  }
  this.registerList.push(HUDelement);
  return true;
};

HUD.unRegister = function(HUDelement) {
  for (var i = 0; i < this.unRegisterList.length; i++) {
    if (this.unRegisterList[i] == HUDelement) { return false; }
  }
  this.unRegisterList.push(HUDelement);
  return true;
};

HUD.cleanUp = function() {
  ctx.font = null;
  ctx.fillStyle = null;
  ctx.strokeStyle = null;
  ctx.lineWidth = 1;
  ctx.shadowColor = null;
  ctx.shadowBlur = null;
  ctx.shadowOffsetX = null;
  ctx.shadowOffsetY = null;
};

HUDRect = function(x, y, z, w, h, fillColor, strokeColor) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
  this.h = h;
  this.fillColor = fillColor;
  this.strokeColor = strokeColor;
};

HUDRect.prototype.draw = function() {
  if (this.strokeColor != null) {
    ctx.fillStyle = this.strokeColor;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
  }

  if (this.fillColor != null) {
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(this.x, this.y, this.w, this.h);
  }

  HUD.cleanUp();
};

HUDText = function(x, y, z, style) {
  this.x = x;
  this.y = y;
  this.z = z;

  this.msg = style.msg;
  this.font = style.font;
  this.fill = style.fill;
  this.stroke = style.stroke;
  this.lineWidth = style.lineWidth;
  this.shadow = style.shadow;
};

HUDText.prototype.draw = function() {
  ctx.font = this.font;
  ctx.lineWidth = this.lineWidth;

  //Stroke
  if (this.stroke != null) {
    ctx.strokeStyle = this.stroke;
    ctx.strokeText(this.msg, this.x, this.y);
  }

  //Text
  if (this.fill != null) {
    if (this.shadow != null) {
      if (this.shadow.color != null) { ctx.shadowColor = this.shadow.color; }
      if (this.shadow.blur != null) { ctx.shadowBlur = this.shadow.blur; }
      if (this.shadow.offsetX != null) { ctx.shadowOffsetX = this.shadow.offsetX; }
      if (this.shadow.offsetY != null) { ctx.shadowOffsetY = this.shadow.offsetY; }
    }
    ctx.fillStyle = this.fill;
    ctx.fillText(this.msg, this.x, this.y);
  }

  HUD.cleanUp();
};

HUDImg = function(x, y, z, w, h, sX, sY, sW, sH, img) {
  this.x = x;
  this.y = y;
  this.z = z;
  this.w = w;
  this.h = h;
  this.sX = sX;
  this.sY = sY;
  this.sW = sW;
  this.sH = sH;
  this.img = new Image();
  this.img.src = img;
};

HUDImg.prototype.draw = function() {
  ctx.drawImage(this.img, this.sX, this.sY, this.sW, this.sH, this.x, this.y, this.w, this.h);
};




//////////////
// GAMELOOP //
//////////////
var gameLoop = new Object();
input.registerNew("pause", ["Enter"]);
gameLoop.lastPause = 0;
gameLoop.isPaused = false;
gameLoop.isInDBug = false;
gameLoop.interval = null;
gameLoop.nextLevel = false;
gameLoop.passCurrent = "";
gameLoop.passIndex = [ "default",
"HELLO1",	"WORLD2",	"WELCOME3",	"TO4",		"SOKOBAN5",	"BUZZ6",	"LOOPER7",	"ARCHER8",	"CLASSIC9",	"KNIGHTS10",
"NEEDLES11",	"RUSH12",	"CRUSH13",	"FREEZE14",	"DROWN15",	"BLOCKED16",	"CHECKER17",	"TIMING18",	"TWINS19",	"EYES20",
"ROOMS21",	"CONGO22",	"SPIRAL23",	"TRAPPED24",	"ROUTE25",	"FOLLOW26",	"LOLO27",	"FLYING28",	"REVENGE29",	"BOSS30",
"STOP31",	"SCREWED32",	"PRISONS33",	"CAREFUL34",	"XFIRE35",	"ROVER36",	"MAZE37",	"CLASSIC38",	"SHIELD39",	"BORROW40",
"CLASSIC41",	"ISLANDS42",	"SHRED43",	"CLASSIC44",	"SUNKEN45",	"PATROL46",	"CLASSIC47",	"CLASSIC48",	"RACE49",	"CLASSIC50",
"REPEATS51",	"STEADY52",	"FUSE53",	"BEEHIVE54",	"DRIFT55",	"RUN56",	"FISHING57",	"FUSETWO58",	"THEEND59",	"PARTTWO60",
"GAMEOVER",	"BONUS62",	"BONUS63",	"BONUS64",	"BONUS65",	"BONUS66",	"BONUS67",	"BONUS68",	"BONUS69",	"BONUS70",
"BONUS71",	"BONUS72",	"BONUS73",	"BONUS74",	"BONUS75",	"BONUS76",	"BONUS77",	"BONUS78",	"BONUS79",	"BONUS80"
];

gameLoop.update = function() {
  time.update();
  input.update();

  if (gameLoop.isPaused == false) {
    stage.update();
    physics.update();
  }

  HUD.update();
  camera.update();

  if (input["pause"].pressed) {
    if (gameLoop.isPaused) {
      gameLoop.unPause();
    } else {
      gameLoop.pause();
    }
  }

  if (input["dbug"].pressed && gameLoop.isPaused === false) {
    if (gameLoop.isInDBug === true) {
      gameLoop.isInDBug = false;
    } else {
      gameLoop.isInDBug = true;
    }
  }

  if (gameLoop.nextLevel === true) {
    gameLoop.nextLevel = false;
    stage.loadCurrentLevel();
  }
};

gameLoop.pause = function() {
  var now = (new Date()).getTime();
  if (now - this.lastPause > 500) {
    this.lastPause = now;
    this.isPaused = true;
    input.clearAll();

    var style = {msg: "Paused",
                 font: "Bold 42px Arial",
                 fill: "white",
                 shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}
    };
    var pauseText = new HUDText(0, 0, 10, style);
    HUD.register(pauseText);
    pauseText.update = function() {
      this.x = (canvas.width/2) - 70;
      this.y = (canvas.height/2);

      if (gameLoop.isPaused == false) {
        HUD.unRegister(this);
      }
    };

    style = {msg: "Enter Password: ",
             font: "Bold 12px Arial",
             fill: "white",
             shadow: {color: "black", blur: 2, offsetX: 1, offsetY: 1}
    };
    var pauseInstruct = new HUDText(0, 0, 10, style);
    HUD.register(pauseInstruct);
    pauseInstruct.update = function() {
      this.x = (canvas.width/2) - 68;
      this.y = (canvas.height/2) + 15;

      if (gameLoop.isPaused == false) {
        HUD.unRegister(this);
      }
    };


    style.msg = "";
    var password = new HUDText(0, 0, 10, style);
    HUD.register(password);
    password.update = function() {
      this.msg = gameLoop.passCurrent;
      this.x = (canvas.width/2) + 35;
      this.y = (canvas.height/2) + 15;

      if (gameLoop.isPaused == false) {
        HUD.unRegister(this);
      }
    };
  }
};

gameLoop.unPause = function() {
  var now = (new Date()).getTime();
  if (now - this.lastPause > 500) {
    this.lastPause = now;
    this.isPaused = false;
    input.clearAll();
  }
};

gameLoop.addPassKey = function(key) {
  if (key === "Enter") {
    for (var i = 1; i < gameLoop.passIndex.length; i++) {
      if (gameLoop.passCurrent === gameLoop.passIndex[i]) {
        stage.levelTime = 0;
        stage.levelDeaths = 0;
        stage.currentLevel = i;
        gameLoop.nextLevel = true;
        gameLoop.passCurrent = "";
        return true;
      }
    }

    gameLoop.passCurrent = "";
    return false;
  }

  if (key === "Backspace") {
    if (gameLoop.passCurrent.length > 0) {
      var temp = [];
      for (var i = 0 ; i < gameLoop.passCurrent.length; i++) {
        temp[i] = gameLoop.passCurrent.toString()[i];
      }
      temp.pop();
      gameLoop.passCurrent = "";

      for (var i = 0 ; i < temp.length; i++) {
        gameLoop.passCurrent += temp[i];
      }

      return true;
    }

    return false;
  }

  //Check for valid key
  var lowerCase = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
  var validKeys = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9"];
  var keyIsValid = false;
  for (var i = 0; i < validKeys.length; i++) {
    if (key === validKeys[i] || key === lowerCase[i]) {
      key = validKeys[i];
      keyIsValid = true;
      break;
    }
  }

  if (keyIsValid === false) {
    return false;
  }

  if (gameLoop.passCurrent.length < 9) {
    gameLoop.passCurrent += key;
  }
  
  return true;
}




////////////
// Helper //
////////////
function RandomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function RandomIntRange(min, max) {
  return parseInt(Math.random() * ((max - min) + 1) + min);
}

function DirToCoor(dir) {
  if (dir === "up")    { return {x: 0, y:-1}; }
  if (dir === "down")  { return {x: 0, y: 1}; }
  if (dir === "left")  { return {x:-1, y: 0}; }
  if (dir === "right") { return {x: 1, y: 0}; }
}

function SpinRight(dir) {
  if (dir === "up")    { return "right"; }
  if (dir === "down")  { return "left"; }
  if (dir === "left")  { return "up"; }
  if (dir === "right") { return "down"; }
}

function SpinLeft(dir) {
  if (dir === "up")    { return "left"; }
  if (dir === "down")  { return "right"; }
  if (dir === "left")  { return "down"; }
  if (dir === "right") { return "up"; }
}


////////////////
// Primitives //
////////////////
function sprite(owner, offsetX, offsetY, sheet) {
  this.owner = owner;
  this.offset = {x:offsetX, y:offsetY}
  this.source = {x:0, y:0}
  this.sheet = sheet;
}

function rigidBody(owner, mass, friction, collider, type, ignores) {

  this.velocity = new Object();
  this.velocity.x = 0;
  this.velocity.y = 0;

  this.owner = owner;
  this.mass = mass;
  this.friction = friction;

  this.collider = collider;
  // Collider X and Y Coordinates, Width and Height, Top, Bottom, Left, and Right boundries.
  Object.defineProperty(owner, "width",     { get: function() { return this.rigidBody.collider.w; }});
  Object.defineProperty(owner, "height", { get: function() { return this.rigidBody.collider.h; }});
  Object.defineProperty(owner, "top",     { get: function() { return this.y - (this.rigidBody.collider.h/2); }});
  Object.defineProperty(owner, "bottom", { get: function() { return this.y + (this.rigidBody.collider.h/2); }});
  Object.defineProperty(owner, "left",     { get: function() { return this.x - (this.rigidBody.collider.w/2); }});
  Object.defineProperty(owner, "right",     { get: function() { return this.x + (this.rigidBody.collider.w/2); }});

  this.type = type || "soft";
  // "soft" - Objects will use force to push themselves off eachother, giving them a bouncy feel.
  // "static" - This object ignores mass and will never be moved by the physics engine.
  // "weightless" - Opposite of static, this object will ignore mass and never cause other physics objects to be moved.
  // "trigger" - This object ignores all collisions, only registering hit() calls.

  // Ignored collisions apply no force on either object, but still cause hit() calls to trigger.
  this.ignores = ignores || [];
}

function animatron() {
  this.loop = [];
  this.state = null;
  this.direction = null;
  this.current = 0;
  this.time = 0;
  this.rate = 0;
}

animatron.prototype.update = function() {
  if (this.loop[this.current].r != null) { this.rate = this.loop[this.current].r; }
  if (this.rate == 0) { return false; }

  this.time += time.deltaTime;
  if (this.time > this.rate) {
    this.time -= this.rate;
    this.current += 1;
    if (this.current >= this.loop.length) {
      this.current = 0;
    }
  }
};
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

  // If we haven�t returned false yet
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



