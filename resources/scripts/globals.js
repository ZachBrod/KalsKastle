// Determines what level the game starts on. Change this if you want to start on a different level.
const STARTLEVEL = 1; 

// If true this will limit the canvas size the game can fit inside of. This is to keep stupid people from playing the game full screen.
const LIMITCANVASSIZE = true;

// This is the camera "zoom". Makes the game look much better, but is probably too dangerous to be used here.
const CAMERASCALE = 1;





// Dont touch these
const TSIZE = 24;    // Tile Size
const HTSIZE = 12;    // Half Tile Size

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