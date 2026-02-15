class GameObject {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
    
    getBounds() {
        return {
            left: this.x - this.width/2,
            right: this.x + this.width/2,
            top: this.y - this.height/2,
            bottom: this.y + this.height/2
        };
    }
    
    collidesWith(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();
        
        return !(bounds2.left > bounds1.right ||
                bounds2.right < bounds1.left ||
                bounds2.top > bounds1.bottom ||
                bounds2.bottom < bounds1.top);
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 40, 40);
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.shield = false;
        this.doubleShot = false;
        this.speedBoost = false;
        this.powerUpTimers = {
            shield: 0,
            double: 0,
            speed: 0
        };
    }
    
    move(dx, dy, canvasWidth, canvasHeight) {
        let currentSpeed = this.speed;
        if (this.speedBoost) {
            currentSpeed *= 1.5;
        }
        
        this.x += dx * currentSpeed;
        this.y += dy * currentSpeed;
        
        // Keep player in bounds
        this.x = Math.max(this.width/2, Math.min(canvasWidth - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvasHeight - this.height/2, this.y));
    }
    
    takeDamage(amount) {
        if (this.shield) {
            this.shield = false;
            return false;
        }
        
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }
    
    update() {
        // Update power-up timers
        Object.keys(this.powerUpTimers).forEach(key => {
            if (this.powerUpTimers[key] > 0) {
                this.powerUpTimers[key]--;
                if (this.powerUpTimers[key] <= 0) {
                    this[key] = false;
                }
            }
        });
    }
    
    activatePowerUp(type, duration) {
        this[type] = true;
        this.powerUpTimers[type] = duration;
    }
}

class Enemy extends GameObject {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type;
        this.health = this.getHealth();
        this.speed = this.getSpeed();
        this.shootCooldown = 0;
        this.pattern = Math.floor(Math.random() * 3); // 0: straight, 1: zigzag, 2: chase
        this.angle = 0;
    }
    
    getHealth() {
        switch(this.type) {
            case 'basic': return 1;
            case 'advanced': return 2;
            case 'elite': return 3;
            case 'boss': return 10;
            default: return 1;
        }
    }
    
    getSpeed() {
        switch(this.type) {
            case 'basic': return 2;
            case 'advanced': return 2.5;
            case 'elite': return 1.5;
            case 'boss': return 0.5;
            default: return 2;
        }
    }
    
    move(playerX) {
        switch(this.pattern) {
            case 0: // Straight down
                this.y += this.speed;
                break;
            case 1: // Zigzag
                this.y += this.speed;
                this.x += Math.sin(this.y * 0.05) * 2;
                break;
            case 2: // Chase player slowly
                this.y += this.speed * 0.8;
                if (this.x < playerX) this.x += this.speed * 0.5;
                else this.x -= this.speed * 0.5;
                break;
        }
    }
    
    takeDamage() {
        this.health--;
        return this.health <= 0;
    }
}

class Bullet extends GameObject {
    constructor(x, y, speed, isEnemy = false) {
        super(x, y, 5, 10);
        this.speed = speed;
        this.isEnemy = isEnemy;
    }
    
    move() {
        if (this.isEnemy) {
            this.y += this.speed;
        } else {
            this.y -= this.speed;
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.size = Math.random() * 3 + 1;
        this.color = color;
        this.life = 1;
        this.decay = 0.02;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

class PowerUp extends GameObject {
    constructor(x, y) {
        super(x, y, 25, 25);
        this.type = ['shield', 'double', 'speed'][Math.floor(Math.random() * 3)];
        this.speed = 2;
        this.animation = 0;
    }
    
    move() {
        this.y += this.speed;
        this.animation += 0.1;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1 + Math.sin(this.animation) * 0.1, 1 + Math.sin(this.animation) * 0.1);
        
        ctx.shadowColor = this.getColor();
        ctx.shadowBlur = 15;
        ctx.fillStyle = this.getColor();
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.getSymbol(), 0, 0);
        ctx.restore();
    }
    
    getColor() {
        switch(this.type) {
            case 'shield': return '#00ffff';
            case 'double': return '#ffff00';
            case 'speed': return '#00ff00';
        }
    }
    
    getSymbol() {
        switch(this.type) {
            case 'shield': return '🛡️';
            case 'double': return '⚡';
            case 'speed': return '🚀';
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.powerUps = [];
        
        this.score = 0;
        this.level = 1;
        this.enemiesDestroyed = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.keys = {};
        
        this.spawnTimer = 0;
        this.bossSpawned = false;
        this.frameCount = 0;
        
        this.initEventListeners();
        this.initUI();
    }
    
    initEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('gameOverModal').style.display = 'none';
            this.restartGame();
        });
    }
    
    initUI() {
        this.updateScore();
        this.updateHealth();
        this.updateLevel();
        this.updateEnemyCount();
        this.updatePowerUps();
    }
    
    handleKeyDown(e) {
        this.keys[e.key] = true;
        
        if (e.key === ' ') {
            e.preventDefault();
            this.shoot();
        }
        
        if (e.key === 'p' || e.key === 'P') {
            this.togglePause();
        }
        
        if (e.key === 'r' || e.key === 'R') {
            this.restartGame();
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.key] = false;
    }
    
    startGame() {
        this.gameRunning = true;
        this.gamePaused = false;
        this.player = new Player(this.canvas.width/2, this.canvas.height - 50);
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        document.getElementById('pauseBtn').textContent = this.gamePaused ? 'Resume' : 'Pause';
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    restartGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        
        // Reset game state
        this.enemies = [];
        this.bullets = [];
        this.particles = [];
        this.powerUps = [];
        this.score = 0;
        this.level = 1;
        this.enemiesDestroyed = 0;
        this.spawnTimer = 0;
        this.bossSpawned = false;
        
        // Update UI
        this.updateScore();
        this.updateLevel();
        this.updateEnemyCount();
        
        // Reset buttons
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    shoot() {
        if (!this.gameRunning || this.gamePaused || !this.player) return;
        
        if (this.player.doubleShot) {
            this.bullets.push(new Bullet(this.player.x - 10, this.player.y - 20, 7, false));
            this.bullets.push(new Bullet(this.player.x + 10, this.player.y - 20, 7, false));
        } else {
            this.bullets.push(new Bullet(this.player.x, this.player.y - 20, 7, false));
        }
    }
    
    spawnEnemy() {
        if (!this.gameRunning || this.gamePaused) return;
        
        // Spawn enemies based on level
        const spawnRate = Math.min(20, 5 + this.level * 2);
        
        if (this.frameCount % spawnRate === 0) {
            // Boss level every 5 levels
            if (this.level % 5 === 0 && !this.bossSpawned && this.enemies.length === 0) {
                this.spawnBoss();
                this.bossSpawned = true;
            } else if (this.level % 5 !== 0) {
                const type = this.getRandomEnemyType();
                const x = Math.random() * (this.canvas.width - 60) + 30;
                this.enemies.push(new Enemy(x, -30, type));
            }
        }
    }
    
    getRandomEnemyType() {
        const rand = Math.random();
        if (this.level < 3) return 'basic';
        if (this.level < 5) {
            if (rand < 0.7) return 'basic';
            return 'advanced';
        }
        if (this.level < 8) {
            if (rand < 0.5) return 'basic';
            if (rand < 0.8) return 'advanced';
            return 'elite';
        }
        if (rand < 0.3) return 'basic';
        if (rand < 0.6) return 'advanced';
        return 'elite';
    }
    
    spawnBoss() {
        const boss = new Enemy(this.canvas.width/2, -50, 'boss');
        boss.width = 80;
        boss.height = 80;
        this.enemies.push(boss);
    }
    
    spawnPowerUp(x, y) {
        if (Math.random() < 0.1) { // 10% chance
            this.powerUps.push(new PowerUp(x, y));
        }
    }
    
    createExplosion(x, y, color = '#ffaa00') {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }
    
    checkCollisions() {
        // Check bullet-enemy collisions
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy) continue;
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (bullet.collidesWith(enemy)) {
                    if (enemy.takeDamage()) {
                        // Enemy destroyed
                        this.score += enemy.type === 'boss' ? 1000 : 100 * enemy.health;
                        this.enemiesDestroyed++;
                        this.createExplosion(enemy.x, enemy.y, '#ff0000');
                        this.spawnPowerUp(enemy.x, enemy.y);
                        
                        this.enemies.splice(j, 1);
                        
                        if (enemy.type === 'boss') {
                            this.levelComplete();
                        }
                    }
                    
                    this.bullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // Check player-enemy collisions
        if (this.player) {
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                
                if (this.player.collidesWith(enemy)) {
                    this.createExplosion(this.player.x, this.player.y, '#ff0000');
                    
                    if (this.player.takeDamage(20)) {
                        this.gameOver();
                        return;
                    }
                    
                    this.enemies.splice(i, 1);
                    this.updateHealth();
                }
            }
        }
        
        // Check player-powerup collisions
        if (this.player) {
            for (let i = this.powerUps.length - 1; i >= 0; i--) {
                const powerUp = this.powerUps[i];
                
                if (this.player.collidesWith(powerUp)) {
                    this.player.activatePowerUp(powerUp.type, 300); // 5 seconds at 60fps
                    this.createExplosion(powerUp.x, powerUp.y, powerUp.getColor());
                    this.powerUps.splice(i, 1);
                    this.updatePowerUps();
                }
            }
        }
    }
    
    update() {
        if (!this.gameRunning || this.gamePaused || !this.player) return;
        
        this.frameCount++;
        
        // Handle player movement
        if (this.keys['ArrowLeft']) this.player.move(-1, 0, this.canvas.width, this.canvas.height);
        if (this.keys['ArrowRight']) this.player.move(1, 0, this.canvas.width, this.canvas.height);
        if (this.keys['ArrowUp']) this.player.move(0, -1, this.canvas.width, this.canvas.height);
        if (this.keys['ArrowDown']) this.player.move(0, 1, this.canvas.width, this.canvas.height);
        
        this.player.update();
        
        // Spawn enemies
        this.spawnEnemy();
        
        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.move(this.player.x);
            
            // Remove enemies that are off screen
            if (enemy.y > this.canvas.height + 50) {
                this.enemies.splice(i, 1);
            }
            
            // Enemy shooting
            if (Math.random() < 0.01 && enemy.type !== 'basic') {
                this.bullets.push(new Bullet(enemy.x, enemy.y + 20, 5, true));
            }
        }
        
        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.move();
            
            // Remove bullets that are off screen
            if (bullet.y < -50 || bullet.y > this.canvas.height + 50) {
                this.bullets.splice(i, 1);
            }
        }
        
        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.move();
            
            if (powerUp.y > this.canvas.height + 50) {
                this.powerUps.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Check collisions
        this.checkCollisions();
        
        // Update UI
        this.updateScore();
        this.updateEnemyCount();
        this.updateHealth();
        this.updatePowerUps();
        
        // Check level progression
        if (this.enemiesDestroyed > this.level * 10 && this.level % 5 !== 0) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.updateLevel();
        
        // Show level complete modal
        const bonus = 1000 * this.level;
        this.score += bonus;
        document.getElementById('levelBonus').textContent = bonus;
        document.getElementById('levelCompleteModal').style.display = 'flex';
        
        setTimeout(() => {
            document.getElementById('levelCompleteModal').style.display = 'none';
        }, 2000);
    }
    
    levelComplete() {
        this.level++;
        this.bossSpawned = false;
        this.updateLevel();
        
        const bonus = 5000;
        this.score += bonus;
        document.getElementById('levelBonus').textContent = bonus;
        document.getElementById('levelCompleteModal').style.display = 'flex';
        
        setTimeout(() => {
            document.getElementById('levelCompleteModal').style.display = 'none';
        }, 2000);
    }
    
    gameOver() {
        this.gameRunning = false;
        
        // Show game over modal
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalLevel').textContent = this.level;
        document.getElementById('enemiesDestroyed').textContent = this.enemiesDestroyed;
        document.getElementById('gameOverModal').style.display = 'flex';
        
        // Reset buttons
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    draw() {
        // Clear canvas with trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        this.drawStars();
        
        // Draw player
        if (this.player) {
            this.ctx.save();
            
            // Shield effect
            if (this.player.shield) {
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 30;
                this.ctx.beginPath();
                this.ctx.arc(this.player.x, this.player.y, 30, 0, Math.PI * 2);
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
            }
            
            // Speed boost effect
            if (this.player.speedBoost) {
                this.ctx.shadowColor = '#00ff00';
                this.ctx.shadowBlur = 20;
            }
            
            // Draw ship
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#00ffff';
            this.ctx.beginPath();
            this.ctx.moveTo(this.player.x, this.player.y - 20);
            this.ctx.lineTo(this.player.x + 15, this.player.y + 10);
            this.ctx.lineTo(this.player.x, this.player.y + 5);
            this.ctx.lineTo(this.player.x - 15, this.player.y + 10);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Engine fire
            if (this.keys['ArrowUp'] || this.keys['ArrowDown'] || this.keys['ArrowLeft'] || this.keys['ArrowRight']) {
                this.ctx.fillStyle = '#ffaa00';
                this.ctx.beginPath();
                this.ctx.moveTo(this.player.x - 8, this.player.y + 5);
                this.ctx.lineTo(this.player.x, this.player.y + 15);
                this.ctx.lineTo(this.player.x + 8, this.player.y + 5);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        }
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.save();
            
            // Enemy color based on type
            let color;
            switch(enemy.type) {
                case 'basic': color = '#ff0000'; break;
                case 'advanced': color = '#ff6600'; break;
                case 'elite': color = '#ff00ff'; break;
                case 'boss': color = '#aa00ff'; break;
            }
            
            this.ctx.shadowColor = color;
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = color;
            
            if (enemy.type === 'boss') {
                // Draw boss
                this.ctx.fillRect(enemy.x - 40, enemy.y - 40, 80, 80);
                
                // Health bar for boss
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(enemy.x - 40, enemy.y - 50, 80 * (enemy.health / 10), 5);
            } else {
                // Draw normal enemy
                this.ctx.beginPath();
                this.ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            this.ctx.restore();
        });
        
        // Draw bullets
        this.bullets.forEach(bullet => {
            this.ctx.save();
            
            if (bullet.isEnemy) {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.shadowColor = '#ff0000';
            } else {
                this.ctx.fillStyle = '#ffff00';
                this.ctx.shadowColor = '#ffff00';
            }
            
            this.ctx.shadowBlur = 10;
            this.ctx.fillRect(bullet.x - 2, bullet.y - 5, 4, 10);
            this.ctx.restore();
        });
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
    }
    
    drawStars() {
        for (let i = 0; i < 50; i++) {
            const x = (i * 17 + this.frameCount) % this.canvas.width;
            const y = (i * 13) % this.canvas.height;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(this.frameCount * 0.01 + i) * 0.3})`;
            this.ctx.fillRect(x, y, 2, 2);
        }
    }
    
    updateScore() {
        document.getElementById('score').textContent = this.score;
    }
    
    updateHealth() {
        if (this.player) {
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            document.getElementById('health-bar').style.width = `${healthPercent}%`;
        }
  }
