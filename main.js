var canvas = document.getElementById("gameCanvas");
var context = canvas.getContext("2d");

var startFrameMillis = Date.now();
var endFrameMillis = Date.now();

// This function will return the time in seconds since the function 
// was last called
// You should only call this function once per frame
function getDeltaTime()
{
	endFrameMillis = startFrameMillis;
	startFrameMillis = Date.now();

		// Find the delta time (dt) - the change in time since the last drawFrame
		// We need to modify the delta time to something we can use.
		// We want 1 to represent 1 second, so if the delta is in milliseconds
		// we divide it by 1000 (or multiply by 0.001). This will make our 
		// animations appear at the right speed, though we may need to use
		// some large values to get objects movement and rotation correct
	var deltaTime = (startFrameMillis - endFrameMillis) * 0.001;
	
		// validate that the delta is within range
	if(deltaTime > 1)
		deltaTime = 1;
		
	return deltaTime;
}

//-------------------- Don't modify anything above here

var SCREEN_WIDTH = canvas.width;
var SCREEN_HEIGHT = canvas.height;

var STATE_SPLASH = 0;
var STATE_GAME = 1;
var STATE_GAMELOST = 2;
var STATE_GAMEWON = 3;

var gameState = STATE_SPLASH;

var keyboard = new Keyboard();

// checks how many layers are in the map
var LAYER_COUNT = 3;
// tells the code how high and long the map is
var MAP = {tw:60, th:15};
// the width and height of a tile
var TILE = 35;
var TILESET_TILE = TILE * 2;
// the amount of pixels between the image border and the tile image in the tilemap
var TILESET_PADDING = 2;
// the amount of pixels between the tile image in the tilemap
var TILESET_SPACING = 2;
// the amount of columns of tile images in the tileset
var TILESET_COUNT_X = 14;
// the amount of rows of tile images in the tileset
var TILESET_COUNT_Y = 14;

var METER = TILE;
var GRAVITY = METER * 9.8 * 3;
// the max horizontal speed, '10 tiles per second'
var MAXDX = METER * 10;
// the max vertical speed, '15 tiles per second'
var MAXDY = METER * 15;
// the horizontal acceleration - takes 1/2 a second to reach maxdx
var ACCEL = MAXDX * 2;
// the horizontal friction - takes 1/6 of a second to stop from maxdx
var FRICTION = MAXDX * 6;
var JUMP = METER * 1500;

var ENEMY_MAXDX = METER * 5;
var ENEMY_ACCEL = ENEMY_MAXDX * 2;

var enemies = [];

var LAYER_COUNT = 3;
var LAYER_BACKGROUND = 0;
var LAYER_PLATFORMS = 1;
var LAYER_LADDERS = 2;

var LAYER_OBJECT_ENEMIES = 3;
var LAYER_OBJECT_TRIGGERS = 4;

var musicBackground;
var sfxFire;

// loads the image to use in the level tiles
var tileset = document.createElement("img");
tileset.src = "tileset.png";

// this array holds the simplified collision data
var cells = [];
function initialize()
{
	// activates the trigger layer in the map
	cells[LAYER_OBJECT_TRIGGERS] = [];
	idx = 0;
	for(var y = 0; y < level1.layers[LAYER_OBJECT_TRIGGERS].height; y++)
	{
		cells[LAYER_OBJECT_TRIGGERS][y] = [];
		for(var x = 0; x < level1.layers[LAYER_OBJECT_TRIGGERS].width; x++)
		{
			if(level1.layers[LAYER_OBJECT_TRIGGERS].data[idx] != 0)
			{
				cells[LAYER_OBJECT_TRIGGERS][y][x] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y-1][x] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y-1][x+1] = 1;
				cells[LAYER_OBJECT_TRIGGERS][y][x+1] = 1;
			}
			else if(cells[LAYER_OBJECT_TRIGGERS][y][x] != 1)
			{
				cells[LAYER_OBJECT_TRIGGERS][y][x] = 0;
			}
			idx++;
		}
	}

	// add enemies into the map
	idx = 0;
	for(var y = 0; y < level1.layers[LAYER_OBJECT_ENEMIES].height; y++)
	{
		for(var x = 0; x < level1.layers[LAYER_OBJECT_ENEMIES].width; x++)
		{
			if(level1.layers[LAYER_OBJECT_ENEMIES].data[idx] != 0)
			{
				var px = tileToPixel(x);
				var py = tileToPixel(y);
				var e = new Enemy(px, py);
				enemies.push(e);
			}
			idx++;
		}
	}

	// activate the collision map
	for(var layerIdx = 0; layerIdx < LAYER_COUNT; layerIdx++)
	{
		cells[layerIdx] = [];
		var idx = 0;
		for(var y = 0; y < level1.layers[layerIdx].height; y++)
		{
			cells[layerIdx][y] = [];
			for(var x = 0; x < level1.layers[layerIdx].width; x++)
			{
				if(level1.layers[layerIdx].data[idx] != 0)
				{
					cells[layerIdx][y][x] = 1;
					cells[layerIdx][y-1][x] = 1;
					cells[layerIdx][y-1][x+1] = 1;
					cells[layerIdx][y][x+1] = 1;
				}
				else if(cells[layerIdx][y][x] != 1)
				{
					cells[layerIdx][y][x] = 0;
				}
				idx++;
			}
		}
	}

	musicBackground = new Howl(
	{
		urls: ["background.ogg"],
		loop: true,
		buffer: true,
		volume: 0.5
	});
	musicBackground.play();

	sfxFire = new Howl(
	{
		urls: ["fireEffect.ogg"],
		buffer: true,
		volume: 1,
		onend: function()
		{
			isSfxPlaying = false;
		}
	});
}

var timer = 600;
// kill counter
var score = 1;
// life counter
var lives = 4;

// some variables to calculate the Frames Per Second (FPS - this tells use
// how fast our game is running, and allows us to make the game run at a 
// constant speed)
var fps = 0;
var fpsCount = 0;
var fpsTime = 0;

// load an image to draw
var chuckNorris = document.createElement("img");
chuckNorris.src = "hero.png";

function cellAtPixelCoord(layer, x, y)
{
	if(x<0 || x>SCREEN_WIDTH)
		return 1;
	// this lets the player fall of the screen, 'meaning death'
	if(y>SCREEN_HEIGHT)
		return 0;
	return cellAtTileCoord(layer, p2t(x), p2t(y));
	{
		gameState = STATE_GAMELOST;
		return;
	}
};

function cellAtTileCoord(layer, tx, ty)
{
	if(tx<0 || tx>=MAP.tw)
		return 1;
	// this lets the player fall of the screen, 'meaning death'
	if(ty>=MAP.th)
		return 0;
	return cells[layer][ty][tx];
	{
		gameState = STATE_GAMELOST;
		return;
	}
};

function tileToPixel(tile)
{
	return tile * TILE;
};

function pixelToTile(pixel)
{
	return Math.floor(pixel/TILE);
};

function bound(value, min, max)
{
	if(value < min)
		return min;
	if(value > max)
		return max;
	return value;
}

var worldOffsetX = 0;
function drawMap()
{
	var startX = -1;
	var maxTiles = Math.floor(SCREEN_WIDTH / TILE) + 2;
	var tileX = pixelToTile(player.position.x);
	var offsetX = TILE + Math.floor(player.position.x%TILE);

	startX = tileX - Math.floor(maxTiles / 2);

	if(startX < - 1)
	{
		startX = 0;
		offsetX = 0;
	}
	if(startX > MAP.tw - maxTiles)
	{
		startX = MAP.tw - maxTiles + 1;
		offsetX = TILE;
	}

	worldOffsetX = startX * TILE + offsetX;

	for(var layeridx=0; layeridx < LAYER_COUNT; layeridx++)
	{
		for(var y = 0; y < level1.layers[layeridx].height; y++)
		{
			var idx = y * level1.layers[layeridx].width + startX;
			for(var x = startX; x < startX + maxTiles; x++)
			{
				if(level1.layers[layeridx].data[idx]!= 0)
				{
					var tileIndex = level1.layers[layeridx].data[idx] - 1;
					var sx = TILESET_PADDING + (tileIndex % TILESET_COUNT_X) * (TILESET_TILE + TILESET_SPACING);
					var sy = TILESET_PADDING + (Math.floor(tileIndex / TILESET_COUNT_Y)) * (TILESET_TILE + TILESET_SPACING);
					context.drawImage(tileset, sx, sy, TILESET_TILE, TILESET_TILE, (x - startX) * TILE - offsetX, (y-1)*TILE, TILESET_TILE, TILESET_TILE);
				}
				idx++;
			}
		}
	}
}

var player = new Player();

var splashTimer = 2.5;
function runSplash(deltaTime)
{

	// if timer reaches 0 switch game state
	splashTimer -= deltaTime;
	if(splashTimer <= 0)
	{
		gameState = STATE_GAME;
		return;
	}

	context.fillStyle = "#000000";
	context.font = "40px Arial";
	context.fillText("Dark Heroes", 210, 220);
	context.fillStyle = "#000000";
	context.font = "30px Arial";
	context.fillText("By Anthony Johnson", 180, 280);
}

var gameTimer = 10.0;
function runGame(deltaTime)
{
	
	context.font = "20px Arial";
	context.fillStyle = "#FFFF00";
	context.fillText("Timer "+timer, 260, 280);

	// if timer reaches 0 switch game state
	gameTimer -= deltaTime;
	timer--;
	if(gameTimer <= 0)
	{
		gameState = STATE_GAMELOST;
		return;
	}

	player.update(deltaTime);
	
	drawMap();
	player.draw();

	var deltaTime = drawMap();

	// update the frame counter 
	fpsTime += deltaTime;
	fpsCount++;
	if(fpsTime >= 1)
	{
		fpsTime -= 1;
		fps = fpsCount;
		fpsCount = 0;
	}	

	for(var i=0; i<enemies.length; i++)
	{
		enemies[i].update(deltaTime);
	}
}

function runGameLost(deltaTime)
{
	context.fillStyle = "#000000";
	context.font = "40px Arial";
	context.fillText("You Didn't Make It", 150, 220);
	context.fillStyle = "#000000";
	context.font = "40px Arial";
	context.fillText("Try Again", 235, 280);
}

function runGameWon(deltaTime)
{
	context.fillStyle = "#000000";
	context.font = "40px Arial";
	context.fillText("Congratulations You Have", 80, 220);
	context.fillStyle = "#000000";
	context.font = "40px Arial";
	context.fillText("Made It To Level 2", 145, 280);
}

function run()
{
	context.fillStyle = "#ccc";		
	context.fillRect(0, 0, canvas.width, canvas.height);

	var deltaTime = getDeltaTime();

	switch(gameState)
	{
		case STATE_SPLASH:
			runSplash(deltaTime);
			break;
		case STATE_GAME:
			runGame(deltaTime);
			break;
		case STATE_GAMELOST:
			runGameLost(deltaTime);
			break;
		case STATE_GAMEWON:
			runGameWon(deltaTime);
			break;
	}
}

initialize();

//-------------------- Don't modify anything below here


// This code will set up the framework so that the 'run' function is called 60 times per second.
// We have a some options to fall back on in case the browser doesn't support our preferred method.
(function() {
  var onEachFrame;
  if (window.requestAnimationFrame) {
    onEachFrame = function(cb) {
      var _cb = function() { cb(); window.requestAnimationFrame(_cb); }
      _cb();
    };
  } else if (window.mozRequestAnimationFrame) {
    onEachFrame = function(cb) {
      var _cb = function() { cb(); window.mozRequestAnimationFrame(_cb); }
      _cb();
    };
  } else {
    onEachFrame = function(cb) {
      setInterval(cb, 1000 / 60);
    }
  }
  
  window.onEachFrame = onEachFrame;
})();

window.onEachFrame(run);
