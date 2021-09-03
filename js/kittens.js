// This section contains some game constants
var GAME_WIDTH = 375;
var GAME_HEIGHT = 500;

var ENEMY_WIDTH = 75;
var ENEMY_HEIGHT = 156;
var MAX_ENEMIES = 3;

var PLAYER_WIDTH = 75;
var PLAYER_HEIGHT = 54;

const PROJ_WIDTH = 50;
const PROJ_HEIGHT = 50;

// These two constants keep us from using "magic numbers" in our code
var LEFT_ARROW_CODE = 37;
var RIGHT_ARROW_CODE = 39;
const SPACE_CODE = 32;

// These two constants allow us to DRY
var MOVE_LEFT = 'left';
var MOVE_RIGHT = 'right';

// Preload game images
var images = {};
['enemy.png', 'stars.png', 'player.png', 'cookie.png'].forEach(imgName => {
    var img = document.createElement('img');
    img.src = 'images/' + imgName;
    images[imgName] = img;
});





class Enemy {
    constructor(xPos) {
        this.x = xPos;
        this.y = -ENEMY_HEIGHT;
        this.sprite = images['enemy.png'];

        // Each enemy should have a different speed
        this.speed = Math.random() / 2 + 0.25;
    }

    update(timeDiff) {
        this.y = this.y + timeDiff * this.speed;
    }

    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
}

class Player {
    constructor() {
        this.x = 2 * PLAYER_WIDTH;
        this.y = GAME_HEIGHT - PLAYER_HEIGHT - 10;
        this.sprite = images['player.png'];
    }

    // This method is called by the game engine when left/right arrows are pressed
    move(direction) {
        if (direction === MOVE_LEFT && this.x > 0) {
            this.x = this.x - PLAYER_WIDTH;
        }
        else if (direction === MOVE_RIGHT && this.x < GAME_WIDTH - PLAYER_WIDTH) {
            this.x = this.x + PLAYER_WIDTH;
        }
    }

    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
}

// TODO: 
// - Add delay before shooting
// - dont spam space
// - actually make the thing kill
class Projectile {
    constructor(xPos, yPos, isOnScreen) {
        this.x = xPos + 13;     // 13 is to center it on the player
        this.y = yPos;
        this.sprite = images['cookie.png'];
        this.speed = -0.22;
        this.isOnScreen = isOnScreen;
    }

    setOffScreen(){
        this.y = -9999;
        this.isOnScreen = false;
    }

    update(timeDiff) {
        if (this.y > -PROJ_HEIGHT){
            this.y = this.y + timeDiff * this.speed;
        }
        else {
            this.isOnScreen = false
        }
    }

    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
}



/*
This section is a tiny game engine.
This engine will use your Enemy and Player classes to create the behavior of the game.
The engine will try to draw your game at 60 frames per second using the requestAnimationFrame function
*/
class Engine {
    constructor(element) {
        // Setup the player
        this.player = new Player();

        // Set up projectile
        this.proj = new Projectile(-2*PROJ_WIDTH, -2*PROJ_HEIGHT, false);

        // Setup enemies, making sure there are always three
        this.setupEnemies();

        // Setup the <canvas> element where we will be drawing
        var canvas = document.createElement('canvas');
        canvas.width = GAME_WIDTH;
        canvas.height = GAME_HEIGHT;
        element.appendChild(canvas);

        this.ctx = canvas.getContext('2d');

        // Since gameLoop will be called out of context, bind it once here.
        this.gameLoop = this.gameLoop.bind(this);
    }

    /*
     The game allows for 5 horizontal slots where an enemy can be present.
     At any point in time there can be at most MAX_ENEMIES enemies otherwise the game would be impossible
     */
    setupEnemies() {
        if (!this.enemies) {
            this.enemies = [];
        }

        while (this.enemies.filter(e => !!e).length < MAX_ENEMIES) {
            this.addEnemy();
        }
    }

    // This method finds a random spot where there is no enemy, and puts one in there
    addEnemy() {
        var enemySpots = GAME_WIDTH / ENEMY_WIDTH;

        var enemySpot;
        // Keep looping until we find a free enemy spot at random

        // ORIGINAL CODE: 
        // while (!enemySpot || this.enemies[enemySpot]) {

        // FIXED CODE:
        // - as soon as we have a value, we dont need to loop anymore... dont use or
        while (!enemySpot && this.enemies[enemySpot]) {
            enemySpot = Math.floor(Math.random() * enemySpots);
        }
        
        this.enemies[enemySpot] = new Enemy(enemySpot * ENEMY_WIDTH);
    }

    addProjectile(){
        //TODO: Shoot and allow only one proj on screen at time
        // - one option is to check if it is off screen or not yet before allowing
        if (!this.proj.isOnScreen) {
            this.proj = new Projectile(this.player.x, GAME_HEIGHT - PLAYER_HEIGHT, true);
            var audio = new Audio('shoot.mp3');
            audio.play();
        }
    }

    // This method kicks off the game
    start() {
        document.getElementById("playButton").disabled = true;

        // Set up bgm
        var audio = new Audio('bgm.mp3');
        audio.play();

        this.score = 0;
        this.lastFrame = Date.now();

        // Listen for keyboard left/right and update the player
        document.addEventListener('keydown', e => {
            if (e.keyCode === LEFT_ARROW_CODE) {
                this.player.move(MOVE_LEFT);
            }
            else if (e.keyCode === RIGHT_ARROW_CODE) {
                this.player.move(MOVE_RIGHT);
            }
            else if (e.keyCode === SPACE_CODE) {
                this.addProjectile();
            }
        });

        this.gameLoop();
    }

    /*
    This is the core of the game engine. The `gameLoop` function gets called ~60 times per second
    During each execution of the function, we will update the positions of all game entities
    It's also at this point that we will check for any collisions between the game entities
    Collisions will often indicate either a player death or an enemy kill

    In order to allow the game objects to self-determine their behaviors, gameLoop will call the `update` method of each entity
    To account for the fact that we don't always have 60 frames per second, gameLoop will send a time delta argument to `update`
    You should use this parameter to scale your update appropriately
     */
    gameLoop() {
        // Check how long it's been since last frame
        var currentFrame = Date.now();
        var timeDiff = currentFrame - this.lastFrame;

        // Increase the score!
        this.score += timeDiff;

        // Call update on all enemies
        this.enemies.forEach(enemy => enemy.update(timeDiff));

        // Update Projectile
        this.proj.update(timeDiff);
        
        // Draw everything!
        this.ctx.drawImage(images['stars.png'], 0, 0); // draw the star bg
        this.enemies.forEach(enemy => enemy.render(this.ctx)); // draw the enemies
        this.player.render(this.ctx); // draw the player
        this.proj.render(this.ctx); // draw the projectile

        // Check if any enemies should die
        this.enemies.forEach((enemy, enemyIdx) => {
            if (enemy.y > GAME_HEIGHT) {
                delete this.enemies[enemyIdx];
            }

            // Projectile collision
            if ((enemy.x < this.proj.x && this.proj.x < enemy.x + ENEMY_WIDTH) &&
                (enemy.y < this.proj.y && this.proj.y < enemy.y + ENEMY_HEIGHT)) {
                
                delete this.enemies[enemyIdx];
                this.proj.setOffScreen();
                this.score += 1000;
            }
        });
        this.setupEnemies();

        // Check if player is dead
        if (this.isPlayerDead()) {
            // If they are dead, then it's game over!
            this.ctx.font = 'bold 30px Impact';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(this.score + ' GAME OVER', 5, 30);
        }
        else {
            // If player is not dead, then draw the score
            this.ctx.font = 'bold 30px Impact';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillText(this.score, 5, 30);

            // Set the time marker and redraw
            this.lastFrame = Date.now();
            requestAnimationFrame(this.gameLoop);
        }
    }

    isPlayerDead() {
        // TODO: fix this function!
        return false;
    }
}





// This section will start the game
var gameEngine = new Engine(document.getElementById('app'));
// gameEngine.start();
