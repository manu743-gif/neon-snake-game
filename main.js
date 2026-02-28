/**
 * Neon Snake PWA - Main Game Logic
 */

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.finalScoreVal = document.getElementById('final-score-val');

        this.startOverlay = document.getElementById('message-overlay');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.pauseOverlay = document.getElementById('pause-overlay');

        // Settings
        this.gridSize = 20;
        this.baseSpeed = 150;
        this.speedIncrement = 2;

        // State
        this.reset();
        this.initControls();
        this.initButtons();
        this.initAudio();
        this.updateHighscoreDisplay();

        // Effects State
        this.particles = [];
        this.shakeTime = 0;

        // Handle Resize
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Show start screen
        this.showOverlay(this.startOverlay);
    }

    initAudio() {
        this.audioCtx = null;
        this.soundEnabled = false;
    }

    playEatSound() {
        if (!this.soundEnabled || !this.audioCtx) return;
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.1);
    }

    playGameOverSound() {
        if (!this.soundEnabled || !this.audioCtx) return;
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, this.audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(55, this.audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + 0.5);
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1,
                color: color
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
    }

    reset() {
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.food = this.spawnFood();
        this.direction = 'right';
        this.nextDirection = 'right';
        this.score = 0;
        this.speed = this.baseSpeed;
        this.isPaused = false;
        this.isGameOver = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.inputLocked = false;

        this.updateScoreDisplay();
    }

    resize() {
        const wrapper = document.getElementById('canvas-wrapper');
        const size = wrapper.clientWidth;
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileCount = Math.floor(size / this.gridSize);
        this.render();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            // Prevent scrolling for game controls
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            // Spacebar logic
            if (e.key === ' ') {
                this.togglePause();
                return;
            }

            // Ignore movement keys while paused or game over
            if (this.isPaused || this.isGameOver) return;

            // Only one direction change per tick
            if (this.inputLocked) return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction !== 'down' && this.direction !== 'up') {
                        this.nextDirection = 'up';
                        this.inputLocked = true;
                    }
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction !== 'up' && this.direction !== 'down') {
                        this.nextDirection = 'down';
                        this.inputLocked = true;
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction !== 'right' && this.direction !== 'left') {
                        this.nextDirection = 'left';
                        this.inputLocked = true;
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction !== 'left' && this.direction !== 'right') {
                        this.nextDirection = 'right';
                        this.inputLocked = true;
                    }
                    break;
            }
        });

        // Mobile Controls
        const bindBtn = (id, dir, opposite) => {
            document.getElementById(id).addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.direction !== opposite) this.nextDirection = dir;
            });
            document.getElementById(id).addEventListener('mousedown', () => {
                if (this.direction !== opposite) this.nextDirection = dir;
            });
        };

        bindBtn('ctrl-up', 'up', 'down');
        bindBtn('ctrl-down', 'down', 'up');
        bindBtn('ctrl-left', 'left', 'right');
        bindBtn('ctrl-right', 'right', 'left');

        // Swipe Controls
        let touchStartX = 0;
        let touchStartY = 0;

        const gameArea = document.getElementById('canvas-wrapper');

        gameArea.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: false });

        gameArea.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Prevent scrolling while playing
        }, { passive: false });

        gameArea.addEventListener('touchend', (e) => {
            let touchEndX = e.changedTouches[0].screenX;
            let touchEndY = e.changedTouches[0].screenY;

            let dx = touchEndX - touchStartX;
            let dy = touchEndY - touchStartY;

            // Minimum swipe distance
            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal swipe
                    if (dx > 0 && this.direction !== 'left') {
                        this.nextDirection = 'right';
                    } else if (dx < 0 && this.direction !== 'right') {
                        this.nextDirection = 'left';
                    }
                } else {
                    // Vertical swipe
                    if (dy > 0 && this.direction !== 'up') {
                        this.nextDirection = 'down';
                    } else if (dy < 0 && this.direction !== 'down') {
                        this.nextDirection = 'up';
                    }
                }
            }
        });
    }

    initButtons() {
        document.getElementById('start-btn').addEventListener('click', () => {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.start();
        });
        document.getElementById('restart-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());

        // Sound toggle
        const soundBtn = document.getElementById('sound-btn');
        soundBtn.addEventListener('click', () => {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            soundBtn.classList.toggle('active');
            this.soundEnabled = soundBtn.classList.contains('active');
        });
    }

    spawnFood() {
        let newFood;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * (this.tileCount || 20)),
                y: Math.floor(Math.random() * (this.tileCount || 20))
            };
            // Check if food spawned on snake
            const onSnake = this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
            if (!onSnake) break;
        }
        return newFood;
    }

    start() {
        this.reset();
        this.hideOverlay(this.startOverlay);
        this.hideOverlay(this.gameOverOverlay);
        if (this.pauseOverlay) this.hideOverlay(this.pauseOverlay);
        this.isGameOver = false;
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    togglePause() {
        if (this.isGameOver) return;
        if (!this.startOverlay.classList.contains('hidden')) return;

        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        pauseBtn.classList.toggle('active', this.isPaused);

        if (this.isPaused) {
            this.showOverlay(this.pauseOverlay);
        } else {
            this.hideOverlay(this.pauseOverlay);
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    gameLoop(timestamp) {
        if (this.isPaused || this.isGameOver) {
            // Still render particles even if game is over/paused briefly
            this.render();
            if (this.particles.length > 0) {
                this.updateParticles();
                requestAnimationFrame((t) => this.gameLoop(t));
            }
            return;
        }

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.accumulator += deltaTime;

        while (this.accumulator >= this.speed) {
            this.update();
            this.accumulator -= this.speed;
        }

        this.updateParticles();
        this.render();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update() {
        this.direction = this.nextDirection;
        this.inputLocked = false;
        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Collision Check (Walls)
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.gameOver();
            return;
        }

        // Collision Check (Self)
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // Food Check
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.speed = Math.max(50, this.baseSpeed - (Math.floor(this.score / 50) * this.speedIncrement));

            // Effects
            const tileSize = this.canvas.width / this.tileCount;
            this.createParticles(
                this.food.x * tileSize + tileSize / 2,
                this.food.y * tileSize + tileSize / 2,
                '#ff0055'
            );
            this.playEatSound();

            this.food = this.spawnFood();
            this.updateScoreDisplay();
            this.vibrate();
        } else {
            this.snake.pop();
        }
    }

    render() {
        this.ctx.save();

        // Handle Shake
        if (this.shakeTime > 0) {
            const shakeX = (Math.random() - 0.5) * 5;
            const shakeY = (Math.random() - 0.5) * 5;
            this.ctx.translate(shakeX, shakeY);
            this.shakeTime--;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const tileSize = this.canvas.width / this.tileCount;
        const padding = 2;

        // Draw Food
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#ff0055';
        this.ctx.fillStyle = '#ff0055';
        this.ctx.beginPath();
        const foodX = this.food.x * tileSize + tileSize / 2;
        const foodY = this.food.y * tileSize + tileSize / 2;
        this.ctx.arc(foodX, foodY, (tileSize / 2) - padding, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw Snake
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#39ff14';

        this.snake.forEach((segment, index) => {
            // Gradient for snake
            const alpha = 1 - (index / this.snake.length) * 0.6;
            this.ctx.fillStyle = index === 0 ? '#39ff14' : `rgba(0, 255, 255, ${alpha})`;
            if (index === 0) {
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = '#39ff14';
            } else {
                this.ctx.shadowBlur = 5;
                this.ctx.shadowColor = '#00ffff';
            }

            this.ctx.fillRect(
                segment.x * tileSize + padding,
                segment.y * tileSize + padding,
                tileSize - padding * 2,
                tileSize - padding * 2
            );
        });

        // Draw Particles
        this.drawParticles();

        // Reset shadow
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    gameOver() {
        this.isGameOver = true;
        this.shakeTime = 20;
        this.playGameOverSound();
        this.finalScoreVal.textContent = this.score;
        this.showOverlay(this.gameOverOverlay);
        this.saveHighScore();
        this.vibrate([100, 50, 100]);
    }

    updateScoreDisplay() {
        this.scoreElement.textContent = String(this.score).padStart(4, '0');
    }

    updateHighscoreDisplay() {
        const highScore = localStorage.getItem('snake-highscore') || 0;
        this.highScoreElement.textContent = String(highScore).padStart(4, '0');
    }

    saveHighScore() {
        const highScore = localStorage.getItem('snake-highscore') || 0;
        if (this.score > highScore) {
            localStorage.setItem('snake-highscore', this.score);
            this.updateHighscoreDisplay();
        }
    }

    showOverlay(overlay) {
        overlay.classList.remove('hidden');
    }

    hideOverlay(overlay) {
        overlay.classList.add('hidden');
    }

    vibrate(pattern = 50) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
